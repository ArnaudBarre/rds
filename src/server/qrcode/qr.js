/**
 * Simplified version of https://github.com/lifthrasiir/qr.js (public domain)
 * for short URLs (octet mode) with low error correction (max length 78).
 * Minified with `esbuild qr.js --minify --format=esm --target=node16 --outfile=qr.min.js`
 * Credit: Kang Seonghoon
 */

var GF256_MAP = [],
  GF256_INVMAP = [-1];
for (var i = 0, v = 1; i < 255; ++i) {
  GF256_MAP.push(v);
  GF256_INVMAP[v] = i;
  v = (v * 2) ^ (v >= 128 ? 0x11d : 0);
}

// generator polynomials up to degree 30
// (should match with polynomials in JIS X 0510:2004 Appendix A)
//
// generator polynomial of degree K is product of (x-\alpha^0), (x-\alpha^1),
// ..., (x-\alpha^(K-1)). by convention, we omit the K-th coefficient (always 1)
// from the result; also other coefficients are written in terms of the exponent
// to \alpha to avoid the redundant calculation. (see also calculateecc below.)
var GF256_GENPOLY = [[]];
for (var i = 0; i < 30; ++i) {
  var prevpoly = GF256_GENPOLY[i],
    poly = [];
  for (var j = 0; j <= i; ++j) {
    var a = j < i ? GF256_MAP[prevpoly[j]] : 0;
    var b = GF256_MAP[(i + (prevpoly[j - 1] || 0)) % 255];
    poly.push(GF256_INVMAP[a ^ b]);
  }
  GF256_GENPOLY.push(poly);
}

// mask functions in terms of row # and column #
// (cf. Table 20 in JIS X 0510:2004 p. 42)
var MASKFUNCS = [
  (i, j) => (i + j) % 2 === 0,
  (i, j) => i % 2 === 0,
  (i, j) => j % 3 === 0,
  (i, j) => (i + j) % 3 === 0,
  (i, j) => (((i / 2) | 0) + ((j / 3) | 0)) % 2 === 0,
  (i, j) => ((i * j) % 2) + ((i * j) % 3) === 0,
  (i, j) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0,
  (i, j) => (((i + j) % 2) + ((i * j) % 3)) % 2 === 0,
];

// returns the code words (sans ECC bits) for given data and configurations.
// requires data to be preprocessed by validatedata. no length check is
// performed, and everything has to be checked before calling this function.
var encode = function (data, maxbuflen) {
  var buf = [];
  var bits = 0,
    remaining = 8;
  var datalen = data.length;

  // this function is intentionally no-op when n=0.
  var pack = function (x, n) {
    if (n >= remaining) {
      buf.push(bits | (x >> (n -= remaining)));
      while (n >= 8) buf.push((x >> (n -= 8)) & 255);
      bits = 0;
      remaining = 8;
    }
    if (n > 0) bits |= (x & ((1 << n) - 1)) << (remaining -= n);
  };

  var nlenbits = 8;
  pack(4, 4);
  pack(datalen, nlenbits);

  for (var i = 0; i < datalen; ++i) {
    pack(data[i], 8);
  }

  // final bits. it is possible that adding terminator causes the buffer
  // to overflow, but then the buffer truncated to the maximum size will
  // be valid as the truncated terminator mode bits and padding is
  // identical in appearance (cf. JIS X 0510:2004 sec 8.4.8).
  pack(0, 4);
  if (remaining < 8) buf.push(bits);

  // the padding to fill up the remaining space. we should not add any
  // words when the overflow already occurred.
  while (buf.length + 1 < maxbuflen) buf.push(0xec, 0x11);
  if (buf.length < maxbuflen) buf.push(0xec);
  return buf;
};

// calculates ECC code words for given code words and generator polynomial.
//
// this is quite similar to CRC calculation as both Reed-Solomon and CRC use
// the certain kind of cyclic codes, which is effectively the division of
// zero-augumented polynomial by the generator polynomial. the only difference
// is that Reed-Solomon uses GF(2^8), instead of CRC's GF(2), and Reed-Solomon
// uses the different generator polynomial than CRC's.
var calculateecc = function (poly, genpoly) {
  var modulus = poly.slice(0);
  var polylen = poly.length,
    genpolylen = genpoly.length;
  for (var i = 0; i < genpolylen; ++i) modulus.push(0);
  for (var i = 0; i < polylen; ) {
    var quotient = GF256_INVMAP[modulus[i++]];
    if (quotient >= 0) {
      for (var j = 0; j < genpolylen; ++j) {
        modulus[i + j] ^= GF256_MAP[(quotient + genpoly[j]) % 255];
      }
    }
  }
  return modulus.slice(polylen);
};

// auguments ECC code words to given code words. the resulting words are
// ready to be encoded in the matrix.
//
// the much of actual augumenting procedure follows JIS X 0510:2004 sec 8.7.
// the code is simplified using the fact that the size of each code & ECC
// blocks is almost same; for example, when we have 4 blocks and 46 data words
// the number of code words in those blocks are 11, 11, 12, 12 respectively.
var augumenteccs = function (poly, genpoly) {
  var subsizes = [];
  var subsize = (poly.length / 1) | 0,
    subsize0 = 0;
  var pivot = 1 - (poly.length % 1);
  for (var i = 0; i < pivot; ++i) {
    subsizes.push(subsize0);
    subsize0 += subsize;
  }
  for (var i = pivot; i < 1; ++i) {
    subsizes.push(subsize0);
    subsize0 += subsize + 1;
  }
  subsizes.push(subsize0);

  var eccs = [];
  for (var i = 0; i < 1; ++i) {
    eccs.push(calculateecc(poly.slice(subsizes[i], subsizes[i + 1]), genpoly));
  }

  var result = [];
  var nitemsperblock = (poly.length / 1) | 0;
  for (var i = 0; i < nitemsperblock; ++i) {
    for (var j = 0; j < 1; ++j) {
      result.push(poly[subsizes[j] + i]);
    }
  }
  for (var j = pivot; j < 1; ++j) {
    result.push(poly[subsizes[j + 1] - 1]);
  }
  for (var i = 0; i < genpoly.length; ++i) {
    for (var j = 0; j < 1; ++j) {
      result.push(eccs[j][i]);
    }
  }
  return result;
};

// auguments BCH(p+q,q) code to the polynomial over GF(2), given the proper
// genpoly. the both input and output are in binary numbers, and unlike
// calculateecc genpoly should include the 1 bit for the highest degree.
//
// actual polynomials used for this procedure are as follows:
// - p=10, q=5, genpoly=x^10+x^8+x^5+x^4+x^2+x+1 (JIS X 0510:2004 Appendix C)
// - p=18, q=6, genpoly=x^12+x^11+x^10+x^9+x^8+x^5+x^2+1 (ibid. Appendix D)
var augumentbch = function (poly, p, genpoly, q) {
  var modulus = poly << q;
  for (var i = p - 1; i >= 0; --i) {
    if ((modulus >> (q + i)) & 1) modulus ^= genpoly << i;
  }
  return (poly << q) | modulus;
};

// creates the base matrix for given version. it returns two matrices, one of
// them is the actual one and the another represents the "reserved" portion
// (e.g. finder and timing patterns) of the matrix.
//
// some entries in the matrix may be undefined, rather than 0 or 1. this is
// intentional (no initialization needed!), and putdata below will fill
// the remaining ones.
var makebasematrix = function (n, alignPos) {
  var matrix = [];
  var reserved = [];
  for (var i = 0; i < n; ++i) {
    matrix.push([]);
    reserved.push([]);
  }

  var blit = function (y, x, h, w, bits) {
    for (var i = 0; i < h; ++i) {
      for (var j = 0; j < w; ++j) {
        matrix[y + i][x + j] = (bits[i] >> j) & 1;
        reserved[y + i][x + j] = 1;
      }
    }
  };

  // finder patterns and a part of timing patterns
  // will also mark the format information area (not yet written) as reserved.
  blit(0, 0, 9, 9, [0x7f, 0x41, 0x5d, 0x5d, 0x5d, 0x41, 0x17f, 0x00, 0x40]);
  blit(n - 8, 0, 8, 9, [0x100, 0x7f, 0x41, 0x5d, 0x5d, 0x5d, 0x41, 0x7f]);
  blit(0, n - 8, 9, 8, [0xfe, 0x82, 0xba, 0xba, 0xba, 0x82, 0xfe, 0x00, 0x00]);

  // the rest of timing patterns
  for (var i = 9; i < n - 8; ++i) {
    matrix[6][i] = matrix[i][6] = ~i & 1;
    reserved[6][i] = reserved[i][6] = 1;
  }

  blit(alignPos, alignPos, 5, 5, [0x1f, 0x11, 0x15, 0x11, 0x1f]);

  return [matrix, reserved];
};

// fills the data portion (i.e. unmarked in reserved) of the matrix with given
// code words. the size of code words should be no more than available bits,
// and remaining bits are padded to 0 (cf. JIS X 0510:2004 sec 8.7.3).
var putdata = function (matrix, reserved, buf) {
  var n = matrix.length;
  var k = 0,
    dir = -1;
  for (var i = n - 1; i >= 0; i -= 2) {
    if (i === 6) --i; // skip the entire timing pattern column
    var jj = dir < 0 ? n - 1 : 0;
    for (var j = 0; j < n; ++j) {
      for (var ii = i; ii > i - 2; --ii) {
        if (!reserved[jj][ii]) {
          // may overflow, but (undefined >> x)
          // is 0 so it will auto-pad to zero.
          matrix[jj][ii] = (buf[k >> 3] >> (~k & 7)) & 1;
          ++k;
        }
      }
      jj += dir;
    }
    dir = -dir;
  }
  return matrix;
};

// XOR-masks the data portion of the matrix. repeating the call with the same
// arguments will revert the prior call (convenient in the matrix evaluation).
var maskdata = function (matrix, reserved, mask) {
  var maskf = MASKFUNCS[mask];
  var n = matrix.length;
  for (var i = 0; i < n; ++i) {
    for (var j = 0; j < n; ++j) {
      if (!reserved[i][j]) matrix[i][j] ^= maskf(i, j);
    }
  }
  return matrix;
};

// puts the format information.
var putformatinfo = function (matrix, reserved, mask) {
  var n = matrix.length;
  var code = augumentbch((1 << 3) | mask, 5, 0x537, 10) ^ 0x5412;
  for (var i = 0; i < 15; ++i) {
    var r = [
      0,
      1,
      2,
      3,
      4,
      5,
      7,
      8,
      n - 7,
      n - 6,
      n - 5,
      n - 4,
      n - 3,
      n - 2,
      n - 1,
    ][i];
    var c = [
      n - 1,
      n - 2,
      n - 3,
      n - 4,
      n - 5,
      n - 6,
      n - 7,
      n - 8,
      7,
      5,
      4,
      3,
      2,
      1,
      0,
    ][i];
    matrix[r][8] = matrix[8][c] = (code >> i) & 1;
    // we don't have to mark those bits reserved; always done
    // in makebasematrix above.
  }
  return matrix;
};

// evaluates the resulting matrix and returns the score (lower is better).
// (cf. JIS X 0510:2004 sec 8.8.2)
//
// the evaluation procedure tries to avoid the problematic patterns naturally
// occuring from the original matrix. for example, it penaltizes the patterns
// which just look like the finder pattern which will confuse the decoder.
// we choose the mask which results in the lowest score among 8 possible ones.
//
// note: zxing seems to use the same procedure and in many cases its choice
// agrees to ours, but sometimes it does not. practically it doesn't matter.
var evaluatematrix = function (matrix) {
  // N1+(k-5) points for each consecutive row of k same-colored modules,
  // where k >= 5. no overlapping row counts.
  var PENALTY_CONSECUTIVE = 3;
  // N2 points for each 2x2 block of same-colored modules.
  // overlapping block does count.
  var PENALTY_TWOBYTWO = 3;
  // N3 points for each pattern with >4W:1B:1W:3B:1W:1B or
  // 1B:1W:3B:1W:1B:>4W, or their multiples (e.g. highly unlikely,
  // but 13W:3B:3W:9B:3W:3B counts).
  var PENALTY_FINDERLIKE = 40;
  // N4*k points for every (5*k)% deviation from 50% black density.
  // i.e. k=1 for 55~60% and 40~45%, k=2 for 60~65% and 35~40%, etc.
  var PENALTY_DENSITY = 10;

  var evaluategroup = function (groups) {
    // assumes [W,B,W,B,W,...,B,W]
    var score = 0;
    for (var i = 0; i < groups.length; ++i) {
      if (groups[i] >= 5) score += PENALTY_CONSECUTIVE + (groups[i] - 5);
    }
    for (var i = 5; i < groups.length; i += 2) {
      var p = groups[i];
      if (
        groups[i - 1] === p
        && groups[i - 2] === 3 * p
        && groups[i - 3] === p
        && groups[i - 4] === p
        && (groups[i - 5] >= 4 * p || groups[i + 1] >= 4 * p)
      ) {
        // this part differs from zxing...
        score += PENALTY_FINDERLIKE;
      }
    }
    return score;
  };

  var n = matrix.length;
  var score = 0,
    nblacks = 0;
  for (var i = 0; i < n; ++i) {
    var row = matrix[i];
    var groups;

    // evaluate the current row
    groups = [0]; // the first empty group of white
    for (var j = 0; j < n; ) {
      var k;
      for (k = 0; j < n && row[j]; ++k) ++j;
      groups.push(k);
      for (k = 0; j < n && !row[j]; ++k) ++j;
      groups.push(k);
    }
    score += evaluategroup(groups);

    // evaluate the current column
    groups = [0];
    for (var j = 0; j < n; ) {
      var k;
      for (k = 0; j < n && matrix[j][i]; ++k) ++j;
      groups.push(k);
      for (k = 0; j < n && !matrix[j][i]; ++k) ++j;
      groups.push(k);
    }
    score += evaluategroup(groups);

    // check the 2x2 box and calculate the density
    var nextrow = matrix[i + 1] || [];
    nblacks += row[0];
    for (var j = 1; j < n; ++j) {
      var p = row[j];
      nblacks += p;
      // at least comparison with next row should be strict...
      if (row[j - 1] === p && nextrow[j] === p && nextrow[j - 1] === p) {
        score += PENALTY_TWOBYTWO;
      }
    }
  }

  score += PENALTY_DENSITY * ((Math.abs(nblacks / n / n - 0.5) / 0.05) | 0);
  return score;
};

export const getMatrix = (url) => {
  const data = [];
  for (let i = 0; i < url.length; i++) data.push(url.charCodeAt(i));

  const [nbModules, maxLength, polySize, alignPos] = [
    /* 2 */ [25, 32, 10, 16],
    /* 3 */ [29, 53, 15, 20],
    /* 4 */ [33, 78, 20, 24],
  ].find((v) => data.length <= v[1]);
  const buf = augumenteccs(
    encode(data, maxLength + 2),
    GF256_GENPOLY[polySize],
  );

  const [matrix, reserved] = makebasematrix(nbModules, alignPos);
  putdata(matrix, reserved, buf);

  let bestScore = Infinity;
  let bestMask = 0;
  for (let mask = 0; mask <= 7; mask++) {
    maskdata(matrix, reserved, mask);
    putformatinfo(matrix, reserved, mask);
    let score = evaluatematrix(matrix);
    if (bestScore > score) {
      bestScore = score;
      bestMask = mask;
    }
    maskdata(matrix, reserved, mask);
  }

  maskdata(matrix, reserved, bestMask);
  putformatinfo(matrix, reserved, bestMask);

  return matrix;
};
