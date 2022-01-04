module Suite exposing (suite)

{-| -}

import Dict exposing (Dict)
import V8.Benchmark.Runner.Json exposing (..)



suite : Benchmark
suite =
    describe "Partial application" <|
        let
            createItems : Int -> Dict Int Int
            createItems n = 
                List.range 1 n
                    |> List.map (\key -> ( key, key ))
                    |> Dict.fromList

            tenItems : Dict Int Int
            tenItems =
                createItems 10

            thousandItems : Dict Int Int
            thousandItems =
                createItems 1000
        in
        [ benchmark "10 items"
            (\() -> Dict.map increment tenItems)
        , benchmark "1000 items"
            (\() -> Dict.map increment thousandItems)
        ]


increment : a -> Int -> Int
increment _ int =
    int + 1
