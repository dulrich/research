//! parse_number(value) as a SQLite loadable extension, written against the
//! raw sqlite3_api_routines table (no rusqlite, no sqlite-loadable).
//!
//! Features (all four combinations are built and compared):
//!   nostd — `#![no_std]`: core only, no standard library.
//!   fast  — single pass with an inline Clinger fast path (port of c-fast);
//!           otherwise the cleaned text is copied into a stack buffer and
//!           parsed with `str::parse::<i64>` / `str::parse::<f64>`.
//!
//! Rules are the same as the original C and Rust versions.
#![cfg_attr(feature = "nostd", no_std)]
#![allow(clippy::missing_safety_doc)]

use core::ffi::{c_char, c_int, c_void};

#[cfg(feature = "nostd")]
#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! {
    extern "C" {
        fn abort() -> !;
    }
    unsafe { abort() }
}

// ---------------------------------------------------------------------------
// The slice of the SQLite C API we use. SQLite passes a pointer to its
// sqlite3_api_routines struct (a table of function pointers) to the entry
// point; these are the slot indices of the functions we call, taken with
// offsetof() from sqlite3ext.h (3.46.1). The table is append-only across
// SQLite releases, so the indices are stable.
// ---------------------------------------------------------------------------
const CREATE_FUNCTION: usize = 45;
const FREE: usize = 58;
const MALLOC: usize = 68;
const RESULT_DOUBLE: usize = 79;
const RESULT_INT64: usize = 83;
const RESULT_VALUE: usize = 89;
const VALUE_BYTES: usize = 103;
const VALUE_TEXT: usize = 109;
const VALUE_TYPE: usize = 113;
const RESULT_ERROR_NOMEM: usize = 137;

const SQLITE_INTEGER: c_int = 1;
const SQLITE_FLOAT: c_int = 2;
const SQLITE_TEXT: c_int = 3;
const SQLITE_UTF8: c_int = 1;
const SQLITE_DETERMINISTIC: c_int = 0x800;
const SQLITE_INNOCUOUS: c_int = 0x200000;

type Ctx = *mut c_void;
type Val = *mut c_void;
type XFunc = unsafe extern "C" fn(Ctx, c_int, *mut Val);

static mut API: *const *const c_void = core::ptr::null();

#[inline(always)]
unsafe fn slot<F: Copy>(i: usize) -> F {
    let p = *API.add(i);
    core::mem::transmute_copy::<*const c_void, F>(&p)
}

#[inline(always)]
unsafe fn result_int64(ctx: Ctx, v: i64) {
    slot::<unsafe extern "C" fn(Ctx, i64)>(RESULT_INT64)(ctx, v)
}

#[inline(always)]
unsafe fn result_double(ctx: Ctx, v: f64) {
    slot::<unsafe extern "C" fn(Ctx, f64)>(RESULT_DOUBLE)(ctx, v)
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
#[cfg(feature = "fast")]
#[inline(always)]
fn is_space(c: u8) -> bool {
    matches!(c, b' ' | b'\t' | b'\n' | b'\r')
}

/// A byte buffer on the stack, or from sqlite3_malloc when the input is long.
struct Buf {
    stack: [u8; 128],
    heap: *mut u8,
    len: usize,
}

impl Buf {
    /// `cap` is an upper bound on the bytes that will be pushed.
    #[inline(always)]
    unsafe fn new(cap: usize) -> Option<Buf> {
        let mut b = Buf { stack: [0; 128], heap: core::ptr::null_mut(), len: 0 };
        if cap > b.stack.len() {
            b.heap = slot::<unsafe extern "C" fn(c_int) -> *mut c_void>(MALLOC)(cap as c_int) as *mut u8;
            if b.heap.is_null() {
                return None;
            }
        }
        Some(b)
    }
    #[inline(always)]
    unsafe fn push(&mut self, c: u8) {
        if self.heap.is_null() {
            *self.stack.get_unchecked_mut(self.len) = c;
        } else {
            *self.heap.add(self.len) = c;
        }
        self.len += 1;
    }
    #[inline(always)]
    unsafe fn as_str(&self) -> &str {
        let p = if self.heap.is_null() { self.stack.as_ptr() } else { self.heap as *const u8 };
        // Only ASCII digits, '-' and '.' are ever pushed.
        core::str::from_utf8_unchecked(core::slice::from_raw_parts(p, self.len))
    }
}

impl Drop for Buf {
    fn drop(&mut self) {
        if !self.heap.is_null() {
            unsafe { slot::<unsafe extern "C" fn(*mut c_void)>(FREE)(self.heap as *mut c_void) }
        }
    }
}

// ---------------------------------------------------------------------------
// Default parser: validate + copy into a buffer, then str::parse
// (the original rust-core algorithm with the per-call Vec replaced).
// ---------------------------------------------------------------------------
#[cfg(not(feature = "fast"))]
unsafe fn parse_text(ctx: Ctx, s: &[u8]) {
    let s = s.trim_ascii();
    let Some(mut buf) = Buf::new(s.len()) else {
        slot::<unsafe extern "C" fn(Ctx)>(RESULT_ERROR_NOMEM)(ctx);
        return;
    };
    let (mut ndigits, mut seen_dot, mut neg) = (0usize, false, false);
    let mut i = 0;
    while i < s.len() {
        let c = s[i];
        match c {
            b',' | b'$' | b'%' => {}
            0xC2 if s.get(i + 1) == Some(&0xA3) => i += 1, // £ in UTF-8
            b'0'..=b'9' => {
                buf.push(c);
                ndigits += 1;
            }
            b'.' if !seen_dot => {
                seen_dot = true;
                buf.push(c);
            }
            b'-' if !neg && buf.len == 0 => {
                neg = true;
                buf.push(c);
            }
            _ => return,
        }
        i += 1;
    }
    if ndigits == 0 {
        return;
    }
    let t = buf.as_str();
    if !seen_dot {
        if let Ok(n) = t.parse::<i64>() {
            result_int64(ctx, n);
            return;
        }
    }
    if let Ok(f) = t.parse::<f64>() {
        result_double(ctx, f);
    }
}

// ---------------------------------------------------------------------------
// Fast parser: one pass; integers never touch a buffer; decimals with
// <= 2^53 significand and <= 22 fractional digits use one exact division
// (Clinger's fast path). Anything else falls back to buffer + str::parse,
// which (unlike strtod in c-fast) is correctly rounded and locale-free.
// ---------------------------------------------------------------------------
#[cfg(feature = "fast")]
static POW10: [f64; 23] = [
    1e0, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13, 1e14, 1e15, 1e16,
    1e17, 1e18, 1e19, 1e20, 1e21, 1e22,
];

#[cfg(feature = "fast")]
#[inline(never)]
#[cold]
unsafe fn parse_slow(ctx: Ctx, s: &[u8]) {
    let Some(mut buf) = Buf::new(s.len() + 1) else {
        slot::<unsafe extern "C" fn(Ctx)>(RESULT_ERROR_NOMEM)(ctx);
        return;
    };
    for &c in s {
        if c.is_ascii_digit() || c == b'.' || c == b'-' {
            buf.push(c); // input already validated; £'s bytes are not ASCII
        }
    }
    #[cfg(not(feature = "strtod"))]
    if let Ok(f) = buf.as_str().parse::<f64>() {
        result_double(ctx, f);
    }
    // `strtod` feature: hand the slow path to the C library, as c-fast does.
    // Drops core's float parser (and its 10 KB table) from the binary, at
    // the price of c-fast's caveat: strtod reads the decimal point from the
    // host process's locale.
    #[cfg(feature = "strtod")]
    {
        extern "C" {
            fn strtod(s: *const c_char, end: *mut *mut c_char) -> f64;
        }
        buf.push(0);
        result_double(ctx, strtod(buf.as_str().as_ptr() as *const c_char, core::ptr::null_mut()));
    }
}

#[cfg(feature = "fast")]
unsafe fn parse_text(ctx: Ctx, s: &[u8]) {
    let (mut i, mut end) = (0usize, s.len());
    while i < end && is_space(s[i]) {
        i += 1;
    }
    while end > i && is_space(s[end - 1]) {
        end -= 1;
    }
    let s = &s[i..end];

    let mut mant: u64 = 0; // first <= 19 significant digits
    let mut nsig = 0u32; // significant digits (leading zeros excluded)
    let mut ndigits = 0u32;
    let mut frac = 0u32; // digits after '.'
    let (mut seen_dot, mut neg, mut emitted) = (false, false, false);

    let mut j = 0;
    while j < s.len() {
        let c = s[j];
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
        } else if c == 0xC2 && j + 1 < s.len() && s[j + 1] == 0xA3 {
            j += 1; // £
        } else if c == b'.' && !seen_dot {
            seen_dot = true;
            emitted = true;
        } else if c == b'-' && !emitted {
            neg = true;
            emitted = true;
        } else {
            return; // invalid -> NULL
        }
        j += 1;
    }
    if ndigits == 0 {
        return;
    }
    if !seen_dot {
        if nsig <= 19 {
            if mant <= i64::MAX as u64 {
                result_int64(ctx, if neg { -(mant as i64) } else { mant as i64 });
                return;
            }
            if neg && mant == i64::MAX as u64 + 1 {
                result_int64(ctx, i64::MIN);
                return;
            }
        }
    } else if nsig <= 19 && mant <= 1u64 << 53 && frac <= 22 {
        // x86-64 / aarch64 evaluate f64 at f64 precision, so this is one
        // correctly rounded IEEE division.
        let v = mant as f64 / POW10[frac as usize];
        result_double(ctx, if neg { -v } else { v });
        return;
    }
    parse_slow(ctx, s);
}

// ---------------------------------------------------------------------------
// SQL function + entry point
// ---------------------------------------------------------------------------
unsafe extern "C" fn parse_number_func(ctx: Ctx, _argc: c_int, argv: *mut Val) {
    let v = *argv;
    match slot::<unsafe extern "C" fn(Val) -> c_int>(VALUE_TYPE)(v) {
        SQLITE_INTEGER | SQLITE_FLOAT => slot::<unsafe extern "C" fn(Ctx, Val)>(RESULT_VALUE)(ctx, v),
        SQLITE_TEXT => {
            let p = slot::<unsafe extern "C" fn(Val) -> *const u8>(VALUE_TEXT)(v);
            let n = slot::<unsafe extern "C" fn(Val) -> c_int>(VALUE_BYTES)(v);
            if !p.is_null() {
                parse_text(ctx, core::slice::from_raw_parts(p, n as usize));
            }
        }
        _ => {} // NULL, BLOB -> NULL
    }
}

type CreateFunction = unsafe extern "C" fn(
    *mut c_void,
    *const c_char,
    c_int,
    c_int,
    *mut c_void,
    Option<XFunc>,
    Option<XFunc>,
    Option<unsafe extern "C" fn(Ctx)>,
) -> c_int;

#[no_mangle]
pub unsafe extern "C" fn sqlite3_parsenumber_init(
    db: *mut c_void,
    _err: *mut *mut c_char,
    api: *const *const c_void,
) -> c_int {
    API = api;
    slot::<CreateFunction>(CREATE_FUNCTION)(
        db,
        c"parse_number".as_ptr(),
        1,
        SQLITE_UTF8 | SQLITE_DETERMINISTIC | SQLITE_INNOCUOUS,
        core::ptr::null_mut(),
        Some(parse_number_func),
        None,
        None,
    )
}
