// tslint:disable-next-line no-require-imports no-var-requires
import program from 'commander';
import * as path from 'path';
import * as Transform from './transform';
import { toolDefaults } from './types';
import { compileToStringSync } from 'node-elm-compiler';
import * as fs from 'fs';
// import * as BenchInit from './benchmark/init'
// import * as Benchmark from './benchmark/benchmark';
// import * as Reporting from './benchmark/reporting';

export async function run(options: {
  inputFilePath: string | undefined,
  outputFilePath: string | null,
  optimizeSpeed: boolean
}) {
  return runWithLogger(
    options,
    console.log.bind(console)
  );
}

async function runWithLogger(
  options: {
    inputFilePath: string | undefined,
    outputFilePath: string | null,
    optimizeSpeed: boolean
  },
  log: (message?: any, ...optionalParams: any[]) => void
) {
  const dirname = process.cwd();
  let jsSource: string = '';
  let elmFilePath = undefined;

  const replacements = null;
  const inputFilePath = options.inputFilePath;
  const o3Enabled = options.optimizeSpeed;

  // if (program.initBenchmark) {
  //   console.log(`Initializing benchmark ${program.initBenchmark}`)
  //   BenchInit.generate(program.initBenchmark)
  //   process.exit(0)
  // }

  //   if (program.benchmark) {
  //       const options = {
  //           compile: true,
  //           gzip: true,
  //           minify: true,
  //           verbose: true,
  //           assetSizes: true,
  //           runBenchmark: [
  //               {
  //                   browser: Browser.Chrome,
  //                   headless: true,
  //               }
  //           ],
  //           transforms: benchmarkDefaults(o3Enabled, replacements),
  //       };
  //       const report = await Benchmark.run(options, [
  //         {
  //           name: 'Benchmark',
  //           dir: program.benchmark,
  //           elmFile: 'V8/Benchmark.elm',
  //         }
  //       ]);
  //       console.log(Reporting.terminal(report));
  // //       fs.writeFileSync('./results.markdown', Reporting.markdownTable(result));
  //       process.exit(0)
  //   }

  if (inputFilePath && inputFilePath.endsWith('.js')) {
    jsSource = fs.readFileSync(inputFilePath, 'utf8');
    log('Optimizing existing JS...');
  } else if (inputFilePath && inputFilePath.endsWith('.elm')) {
    elmFilePath = inputFilePath;
    jsSource = compileToStringSync([inputFilePath], {
      output: 'output/elm.opt.js',
      cwd: dirname,
      optimize: true,
      processOpts:
      // ignore stdout
      {
        stdio: ['inherit', 'ignore', 'inherit'],
      },
    });
    if (jsSource != '') {
      log('Compiled, optimizing JS...');
    } else {
      process.exit(1)
    }
  } else {
    console.error('Please provide a path to an Elm file.');
    program.outputHelp();
    return;
  }
  if (jsSource != '') {
    const transformed = await Transform.transform(
      dirname,
      jsSource,
      elmFilePath,
      false,
      toolDefaults(o3Enabled, replacements),
    );

    // Make sure all the folders up to the output file exist, if not create them.
    // This mirrors elm make behavior.
    const outputDirectory = path.dirname(program.output);
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }
    fs.writeFileSync(program.output, transformed);
    const fileName = path.basename(inputFilePath);
    log('Success!');
    log('');
    log(`   ${fileName} ───> ${program.output}`);
    log('');
  }
}
