var $elm$core$List$lengthHelper = F2(
	function (list, acc) {
		lengthHelper:
		while (true) {
			if (!list.b) {
				return acc;
			} else {
				var xs = list.b;
				var $temp$list = xs,
					$temp$acc = acc + 1;
				list = $temp$list;
				acc = $temp$acc;
				continue lengthHelper;
			}
		}
	}), $elm$core$List$length = function (list) {
	return A2($elm$core$List$lengthHelper, list, 0);
};