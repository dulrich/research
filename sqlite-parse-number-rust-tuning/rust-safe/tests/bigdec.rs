//! Differential tests for the `bigdec` slow path against core's correctly
//! rounded `str::parse::<f64>`, bit for bit. Run:
//!
//!     cargo test --release --features bigdec
//!
//! Fixed seeds and counts; any mismatch fails the test. The two source files
//! are included by path because the crate is a `cdylib` (nothing to link a
//! test against).
#![allow(dead_code)]

#[path = "../bigdec.rs"]
mod bigdec;
#[path = "../parse.rs"]
mod parse;

use parse::{parse_number, Num};

struct Rng(u64);
impl Rng {
    fn next(&mut self) -> u64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        self.0
    }
}

fn reference(s: &str) -> f64 {
    s.parse().expect("test input must be a valid float literal")
}

/// bigdec::parse on a plain `[-]digits[.digits]` string against core.
fn check(s: &str, bad: &mut u64) {
    let (want, got) = (reference(s), bigdec::parse(s.as_bytes()));
    if want.to_bits() != got.to_bits() {
        *bad += 1;
        if *bad <= 10 {
            eprintln!("MISMATCH {:?} want {want:e} got {got:e}", &s[..s.len().min(80)]);
        }
    }
}

/// The full `parse_number` seam on decorated text. `plain` is the same number
/// with the decoration removed (what core parses).
fn check_decorated(decorated: &str, plain: &str, bad: &mut u64) {
    let want = reference(plain);
    let ok = match parse_number(decorated.as_bytes()) {
        Some(Num::Real(v)) => v.to_bits() == want.to_bits(),
        // Integer-valued input without a dot (at most 19 digits) is an Int.
        Some(Num::Int(i)) => plain.parse::<i64>() == Ok(i),
        None => false,
    };
    if !ok {
        *bad += 1;
        if *bad <= 10 {
            eprintln!("MISMATCH decorated {decorated:?} plain {:?}", &plain[..plain.len().min(80)]);
        }
    }
}

const HAND: [&str; 10] = ["0.0", "-0.0", "00.000", "1.5", "9007199254740993.0", "9007199254740993.00000000000000000000001",
              "179769313486231570814527423731704356798070567525844996598917476803157260780028538760589558632766878171540458953514382464234321326889464182768467546703537516986049910576551282076245490090389328944075868508455133942304583236903222948165808559332123348274797826204144723168738177180919299881250404026184124858368.0",
              "0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000049406564584124654",
              "0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000024703282292062327208828439643411068618252990130716238221279284125033775363510437593264991818081799618989828234772285886546332835517796989819938739800539093906315035659515570226392290858392449105184435931802849936536152500319370457678249219365623669863658480757001585769269903706311928279558551332927834338409351978015531246597263579574622766465272827220056374006485499977096599470454020828166226237857393450736339007967761930577506740176324673600968951340535537458516661134223766678604162159680461914467291840300530057530849048765391711386591646239524912623653881879636239373280423891018672348497668235089863388587925628302755995657524455507255189313690836254779186948667994968324049705821028513185451396213837722826145437693412532098591327667236328125",
              "1" ];

#[test]
fn hand_cases() {
    let mut bad = 0;
    for s in HAND {
        check(s, &mut bad);
    }
    // 1,000-digit tail past the 800-digit buffer: the truncation flag.
    let mut long = String::from("1.");
    for _ in 0..1000 {
        long.push('0');
    }
    long.push('1');
    check(&long, &mut bad);
    assert_eq!(bad, 0);
}

/// 2M random decimals, 400k exact halfway ties between adjacent doubles over
/// the full exponent range, each with an up-nudge and a down-nudge.
#[test]
fn random_and_ties() {
    const N: u64 = 2_000_000;
    let (mut bad, mut ties) = (0u64, 0u64);
    let mut r = Rng(0x9E3779B97F4A7C15);
    for i in 0..N {
        let mut s = String::new();
        if r.next() & 1 == 0 {
            s.push('-');
        }
        let ilen = (r.next() % 25) as usize;
        let flen = (r.next() % 40) as usize;
        let lz = (r.next() % 8) == 0;
        for k in 0..ilen {
            s.push(char::from(b'0' + if lz && k < 3 { 0 } else { (r.next() % 10) as u8 }));
        }
        if ilen == 0 {
            s.push('0');
        }
        s.push('.');
        let fz = (r.next() % 6) as usize * (r.next() % 60) as usize; // runs of leading fraction zeros
        for _ in 0..fz.min(flen + 40) {
            s.push('0');
        }
        for _ in 0..flen {
            s.push(char::from(b'0' + (r.next() % 10) as u8));
        }
        if i % 97 == 0 {
            for _ in 0..(r.next() % 900) {
                s.push(char::from(b'0' + (r.next() % 10) as u8));
            }
        }
        check(&s, &mut bad);
        // Exact halfway neighbours: decimal expansion of a random double's midpoint.
        if i % 5 == 0 {
            let b = r.next() & 0x7FEF_FFFF_FFFF_FFFF;
            let (lo, hi) = (f64::from_bits(b), f64::from_bits(b + 1));
            if lo.is_finite() && hi.is_finite() {
                let m = midpoint(&format!("{:.1100}", lo), &format!("{:.1100}", hi));
                check(&m, &mut bad);
                ties += 1;
                check(&nudge(&m, true), &mut bad);
                check(&nudge(&m, false), &mut bad);
            }
        }
    }
    println!("random {N} ties {ties} (+2 nudges each) mismatches {bad}");
    assert_eq!(bad, 0);
}

/// Decorated long numbers through `parse_number` (the real seam: trimmed,
/// still decorated input reaches the slow path).
#[test]
fn decorated_regressions() {
    let mut bad = 0;
    let cases = [
        ("$1,234.5678901234567890123", "1234.5678901234567890123"),
        ("-£0.000000000000000000000000001", "-0.000000000000000000000000001"),
        ("99.99999999999999999999%", "99.99999999999999999999"),
        ("  $-1,234,567,890,123,456,789,012.5  ", "-1234567890123456789012.5"),
        ("£12,345,678,901,234,567,890.123456789%", "12345678901234567890.123456789"),
        ("$0.1234567890123456789012345678901234567890", "0.1234567890123456789012345678901234567890"),
        ("9,007,199,254,740,993.00000000000000000000001", "9007199254740993.00000000000000000000001"),
        ("£-0.000,000,000,000,000,000,000,000,000,000,05", "-0.00000000000000000000000000000005"),
        ("$12345678901234567890123", "12345678901234567890123"),
    ];
    for (d, p) in cases {
        check_decorated(d.trim(), p, &mut bad);
        check_decorated(d, p, &mut bad);
    }
    // Random long decimals wrapped in decoration: `,` between digit groups of
    // the integer part, a currency prefix and a `%` or `£` affix.
    let mut r = Rng(0xD1B54A32D192ED03);
    for _ in 0..200_000 {
        let neg = r.next() & 1 == 0;
        let ilen = 1 + (r.next() % 24) as usize;
        let flen = 1 + (r.next() % 40) as usize;
        let ints: Vec<u8> = (0..ilen).map(|_| b'0' + (r.next() % 10) as u8).collect();
        let fracs: String = (0..flen).map(|_| char::from(b'0' + (r.next() % 10) as u8)).collect();
        let mut plain = String::new();
        let mut dec = String::new();
        if neg {
            plain.push('-');
        }
        match r.next() % 3 {
            0 => dec.push('$'),
            1 => dec.push_str("£"),
            _ => {}
        }
        if neg {
            dec.push('-');
        }
        for (k, c) in ints.iter().enumerate() {
            if k > 0 && (ilen - k) % 3 == 0 && r.next() & 1 == 0 {
                dec.push(',');
            }
            plain.push(char::from(*c));
            dec.push(char::from(*c));
        }
        plain.push('.');
        dec.push('.');
        plain.push_str(&fracs);
        dec.push_str(&fracs);
        if r.next() & 1 == 0 {
            dec.push('%');
        }
        check_decorated(&dec, &plain, &mut bad);
    }
    assert_eq!(bad, 0);
}

// Exact decimal midpoint of two non-negative decimals with the same number of
// fraction digits: (a + b) / 2, with one extra fraction digit.
fn midpoint(a: &str, b: &str) -> String {
    let (ai, af) = a.split_once('.').unwrap();
    let (bi, bf) = b.split_once('.').unwrap();
    assert_eq!(af.len(), bf.len());
    let w = ai.len().max(bi.len());
    let da: Vec<u8> = format!("{:0>w$}{}", ai, af).bytes().map(|c| c - b'0').collect();
    let db: Vec<u8> = format!("{:0>w$}{}", bi, bf).bytes().map(|c| c - b'0').collect();
    let mut sum = vec![0u8; da.len() + 1];
    let mut carry = 0u8;
    for i in (0..da.len()).rev() { let s = da[i] + db[i] + carry; sum[i + 1] = s % 10; carry = s / 10; }
    sum[0] = carry;
    sum.push(0); // one extra fraction digit for the half
    let mut rem = 0u8;
    for d in sum.iter_mut() { let v = rem * 10 + *d; *d = v / 2; rem = v % 2; }
    let int_len = w + 1;
    let digits: String = sum.iter().map(|d| char::from(b'0' + d)).collect();
    format!("{}.{}", &digits[..int_len], &digits[int_len..])
}

// The tie moved by one unit in a far decimal place (up) or truncated (down).
fn nudge(m: &str, up: bool) -> String {
    let t = m.trim_end_matches('0');
    if up { format!("{}{}", m, "0000000000000000000001") } else {
        // Drop the final nonzero digit's last unit: replace last digit d with d-1 then append 9s.
        let mut v: Vec<u8> = t.trim_end_matches('.').bytes().collect();
        let mut i = v.len();
        loop { i -= 1; if v[i] == b'.' { continue; } if v[i] == b'0' { v[i] = b'9'; } else { v[i] -= 1; break; } }
        let mut s = String::from_utf8(v).unwrap(); if !s.contains('.') { s.push('.'); } s.push_str("9999999999"); s
    }
}
