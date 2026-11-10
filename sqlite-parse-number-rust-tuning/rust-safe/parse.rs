//! Safe parser: same rules and same single-pass fast path as rust-raw's
//! `fast` build, with no `unsafe` (enforced).
#![forbid(unsafe_code)]

#[cfg(feature = "nostd")]
use alloc::vec::Vec;

pub enum Num {
    Int(i64),
    Real(f64),
}

const POW10: [f64; 23] = [
    1e0, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13, 1e14, 1e15, 1e16,
    1e17, 1e18, 1e19, 1e20, 1e21, 1e22,
];

fn is_space(c: u8) -> bool {
    matches!(c, b' ' | b'\t' | b'\n' | b'\r')
}

fn trim(mut s: &[u8]) -> &[u8] {
    while let [first, rest @ ..] = s {
        if !is_space(*first) {
            break;
        }
        s = rest;
    }
    while let [rest @ .., last] = s {
        if !is_space(*last) {
            break;
        }
        s = rest;
    }
    s
}

#[inline]
pub fn parse_number(s: &[u8]) -> Option<Num> {
    let s = trim(s);
    let mut mant: u64 = 0; // first <= 19 significant digits
    let mut nsig = 0u32; // significant digits (leading zeros excluded)
    let mut ndigits = 0u32;
    let mut frac = 0u32; // digits after '.'
    let (mut seen_dot, mut neg, mut emitted) = (false, false, false);

    let mut it = s.iter();
    while let Some(&c) = it.next() {
        let d = c.wrapping_sub(b'0');
        if d < 10 {
            ndigits += 1;
            frac += seen_dot as u32;
            if mant != 0 || d != 0 {
                if nsig < 19 {
                    mant = mant * 10 + d as u64;
                }
                nsig += 1;
            }
            emitted = true;
        } else if c == b',' || c == b'$' || c == b'%' {
        } else if c == 0xC2 && it.as_slice().first() == Some(&0xA3) {
            it.next(); // £
        } else if c == b'.' && !seen_dot {
            seen_dot = true;
            emitted = true;
        } else if c == b'-' && !emitted {
            neg = true;
            emitted = true;
        } else {
            return None;
        }
    }
    if ndigits == 0 {
        return None;
    }
    if !seen_dot {
        if nsig <= 19 {
            if let Ok(m) = i64::try_from(mant) {
                return Some(Num::Int(if neg { -m } else { m }));
            }
            if neg && mant == i64::MIN.unsigned_abs() {
                return Some(Num::Int(i64::MIN));
            }
        }
    } else if nsig <= 19 && mant <= 1u64 << 53 && frac <= 22 {
        // Both operands exact -> one correctly rounded division (x86-64 /
        // aarch64 evaluate f64 at f64 precision).
        let v = mant as f64 / POW10[frac as usize];
        return Some(Num::Real(if neg { -v } else { v }));
    }
    parse_slow(s)
}

/// Rare path (very long numbers): rebuild "-digits.digits" and use core's
/// correctly rounded parser. Allocates; input is already validated.
#[cold]
#[inline(never)]
fn parse_slow(s: &[u8]) -> Option<Num> {
    let buf: Vec<u8> = s.iter().copied().filter(|c| c.is_ascii_digit() || *c == b'.' || *c == b'-').collect();
    let t = core::str::from_utf8(&buf).ok()?;
    t.parse::<f64>().ok().map(Num::Real)
}
