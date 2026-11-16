//! Compact, correctly rounded decimal -> f64 for the rare slow path.
//!
//! The algorithm is the shape of Go's `strconv` "decimal" fallback
//! (<https://github.com/golang/go/blob/master/src/strconv/decimal.go>,
//! BSD-3-Clause): a fixed 800-digit decimal buffer is scaled by shifts of at
//! most 60 bits into [0.5, 1), adjusted for denormals, shifted left by 53
//! bits, then rounded half to even with a truncation flag. This is an
//! independent reimplementation; only the 9-entry `POWTAB` constants are
//! taken from Go. Left shifts carry right-to-left into a scratch buffer, so
//! Go's left-shift table is not needed.
//!
//! No `unsafe`, no allocation, no locale. The input is the trimmed, still
//! decorated text that `parse_number` already validated: every byte that is
//! not a digit, `.` or `-` (`$`, `,`, `%`, the two bytes of `£`) is skipped.
#![forbid(unsafe_code)]

const CAP: usize = 800;

struct Dec { d: [u8; CAP], nd: usize, dp: i32, trunc: bool }

impl Dec {
    fn trim(&mut self) {
        while self.nd > 0 && self.d[self.nd - 1] == 0 { self.nd -= 1; }
        if self.nd == 0 { self.dp = 0; }
    }
    // Divide by 2^k, k <= 60.
    fn shr(&mut self, k: u32) {
        let (mut r, mut w) = (0usize, 0usize);
        let mut n: u64 = 0;
        while (n >> k) == 0 {
            if r >= self.nd {
                if n == 0 { self.nd = 0; return; }
                while (n >> k) == 0 { n *= 10; r += 1; }
                break;
            }
            n = n * 10 + self.d[r] as u64; r += 1;
        }
        self.dp -= r as i32 - 1;
        let mask = (1u64 << k) - 1;
        while r < self.nd {
            let c = self.d[r] as u64; r += 1;
            self.d[w] = (n >> k) as u8; w += 1;
            n = (n & mask) * 10 + c;
        }
        while n > 0 {
            let dig = (n >> k) as u8; n = (n & mask) * 10;
            if w < CAP { self.d[w] = dig; w += 1; } else if dig > 0 { self.trunc = true; }
        }
        self.nd = w; self.trim();
    }
    // Multiply by 2^k, k <= 60: right-to-left into a scratch, then copy back.
    fn shl(&mut self, k: u32) {
        let mut out = [0u8; CAP + 20];
        let mut o = out.len();
        let mut carry: u64 = 0;
        let mut r = self.nd;
        while r > 0 {
            r -= 1;
            let n = ((self.d[r] as u64) << k) + carry;
            o -= 1; out[o] = (n % 10) as u8; carry = n / 10;
        }
        while carry > 0 { o -= 1; out[o] = (carry % 10) as u8; carry /= 10; }
        let len = out.len() - o;
        self.dp += (len - self.nd) as i32;
        let keep = len.min(CAP);
        if out[o + keep..].iter().any(|&x| x != 0) { self.trunc = true; }
        self.d[..keep].copy_from_slice(&out[o..o + keep]);
        self.nd = keep; self.trim();
    }
    fn shift(&mut self, mut k: i32) {
        if self.nd == 0 { return; }
        while k > 60 { self.shl(60); k -= 60; }
        while k < -60 { self.shr(60); k += 60; }
        if k > 0 { self.shl(k as u32) } else if k < 0 { self.shr((-k) as u32) }
    }
    fn round_up(&self, nd: usize) -> bool {
        if nd >= self.nd { return false; }
        if self.d[nd] == 5 && nd + 1 == self.nd {
            if self.trunc { return true; }
            return nd > 0 && self.d[nd - 1] % 2 == 1;
        }
        self.d[nd] >= 5
    }
    fn rounded_int(&self) -> u64 {
        if self.dp > 20 { return u64::MAX; }
        let mut n: u64 = 0;
        let mut i = 0usize;
        while (i as i32) < self.dp { n = n * 10 + if i < self.nd { self.d[i] as u64 } else { 0 }; i += 1; }
        if self.dp >= 0 && self.round_up(self.dp as usize) { n += 1; }
        n
    }
}

const POWTAB: [i32; 9] = [1, 3, 6, 9, 13, 16, 19, 23, 26];

pub fn parse(s: &[u8]) -> f64 {
    let mut x = Dec { d: [0; CAP], nd: 0, dp: 0, trunc: false };
    let mut neg = false;
    let mut seen_dot = false;
    for &c in s {
        match c {
            b'-' => neg = true,
            b'.' => seen_dot = true,
            b'0'..=b'9' => {
                // Leading zeros are not stored; after the dot they move dp down.
                if c == b'0' && x.nd == 0 {
                    if seen_dot {
                        x.dp -= 1;
                    }
                    continue;
                }
                if x.nd < CAP {
                    x.d[x.nd] = c - b'0';
                    x.nd += 1;
                } else if c != b'0' {
                    x.trunc = true;
                }
                if !seen_dot {
                    x.dp += 1;
                }
            }
            _ => {} // decoration: `$` `,` `%` and the bytes of `£`
        }
    }
    if x.nd == 0 {
        x.dp = 0;
    }
    x.trim();
    let v = f64::from_bits(to_bits(&mut x));
    if neg { -v } else { v }
}

fn to_bits(x: &mut Dec) -> u64 {
    const BIAS: i32 = -1023;
    const INF: u64 = 0x7FF << 52;
    if x.nd == 0 { return 0; }
    if x.dp > 310 { return INF; }
    if x.dp < -330 { return 0; }
    let mut exp: i32 = 0;
    while x.dp > 0 {
        let n = if x.dp as usize >= POWTAB.len() { 27 } else { POWTAB[x.dp as usize] };
        x.shift(-n); exp += n;
    }
    while x.dp < 0 || (x.dp == 0 && x.d[0] < 5) {
        let n = if (-x.dp) as usize >= POWTAB.len() { 27 } else { POWTAB[(-x.dp) as usize] };
        x.shift(n); exp -= n;
    }
    exp -= 1;
    if exp < BIAS + 1 { let n = BIAS + 1 - exp; x.shift(-n); exp += n; }
    if exp - BIAS >= 0x7FF { return INF; }
    x.shift(53);
    let mut mant = x.rounded_int();
    if mant == 2 << 52 { mant >>= 1; exp += 1; if exp - BIAS >= 0x7FF { return INF; } }
    if mant & (1 << 52) == 0 { exp = BIAS; }
    (mant & ((1 << 52) - 1)) | ((((exp - BIAS) as u64) & 0x7FF) << 52)
}
