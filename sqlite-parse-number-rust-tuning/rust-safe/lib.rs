//! parse_number(value) as a SQLite loadable extension, with `unsafe`
//! confined to the FFI boundary.
//!
//! - `parse` is 100% safe code (`#![forbid(unsafe_code)]`): the same
//!   single-pass fast-path algorithm as rust-raw's `fast` build, written with
//!   slices and checked indexing.
//! - `ffi` holds every `unsafe` in the crate: calls through SQLite's API
//!   table, turning `argv` into a slice, and (no_std only) a global allocator
//!   backed by sqlite3_malloc.
//!
//! Feature `nostd`: `#![no_std]` + `alloc`.
#![cfg_attr(feature = "nostd", no_std)]
#![deny(unsafe_op_in_unsafe_fn)]

#[cfg(feature = "nostd")]
extern crate alloc;

mod parse;

mod ffi {
    //! The only module allowed to contain `unsafe`.
    use crate::parse::{parse_number, Num};
    use core::ffi::{c_char, c_int, c_void};
    use core::sync::atomic::{AtomicPtr, Ordering};

    // Slot indices in sqlite3_api_routines (offsetof() from sqlite3ext.h 3.46.1).
    const CREATE_FUNCTION: usize = 45;
    #[cfg(feature = "nostd")]
    const FREE: usize = 58;
    #[cfg(feature = "nostd")]
    const MALLOC: usize = 68;
    const RESULT_DOUBLE: usize = 79;
    const RESULT_INT64: usize = 83;
    const RESULT_VALUE: usize = 89;
    const VALUE_BYTES: usize = 103;
    const VALUE_TEXT: usize = 109;
    const VALUE_TYPE: usize = 113;

    const SQLITE_INTEGER: c_int = 1;
    const SQLITE_FLOAT: c_int = 2;
    const SQLITE_TEXT: c_int = 3;
    const FLAGS: c_int = 1 /* UTF8 */ | 0x800 /* DETERMINISTIC */ | 0x200000 /* INNOCUOUS */;

    type Ctx = *mut c_void;
    type Val = *mut c_void;

    // Set once by the entry point; Relaxed is enough because SQLite calls
    // the entry point before any function call on that connection.
    static API: AtomicPtr<*const c_void> = AtomicPtr::new(core::ptr::null_mut());

    /// Read function-pointer slot `i` of the API table as type `F`.
    /// # Safety
    /// The entry point has run (API is set) and slot `i` holds a function of type `F`.
    #[inline(always)]
    unsafe fn slot<F: Copy>(i: usize) -> F {
        unsafe { core::mem::transmute_copy(&*API.load(Ordering::Relaxed).add(i)) }
    }

    unsafe extern "C" fn parse_number_func(ctx: Ctx, _argc: c_int, argv: *mut Val) {
        // SAFETY (whole fn): SQLite passes a valid ctx and argv[0] (nArg = 1),
        // and value_text/value_bytes describe a buffer valid for this call.
        unsafe {
            let v = *argv;
            match slot::<unsafe extern "C" fn(Val) -> c_int>(VALUE_TYPE)(v) {
                SQLITE_INTEGER | SQLITE_FLOAT => slot::<unsafe extern "C" fn(Ctx, Val)>(RESULT_VALUE)(ctx, v),
                SQLITE_TEXT => {
                    let p = slot::<unsafe extern "C" fn(Val) -> *const u8>(VALUE_TEXT)(v);
                    let n = slot::<unsafe extern "C" fn(Val) -> c_int>(VALUE_BYTES)(v);
                    if p.is_null() {
                        return;
                    }
                    match parse_number(core::slice::from_raw_parts(p, n as usize)) {
                        Some(Num::Int(i)) => slot::<unsafe extern "C" fn(Ctx, i64)>(RESULT_INT64)(ctx, i),
                        Some(Num::Real(f)) => slot::<unsafe extern "C" fn(Ctx, f64)>(RESULT_DOUBLE)(ctx, f),
                        None => {}
                    }
                }
                _ => {}
            }
        }
    }

    type XFunc = unsafe extern "C" fn(Ctx, c_int, *mut Val);
    type CreateFunction = unsafe extern "C" fn(
        *mut c_void, *const c_char, c_int, c_int, *mut c_void,
        Option<XFunc>, Option<XFunc>, Option<unsafe extern "C" fn(Ctx)>,
    ) -> c_int;

    #[no_mangle]
    pub unsafe extern "C" fn sqlite3_parsenumber_init(
        db: *mut c_void,
        _err: *mut *mut c_char,
        api: *const *const c_void,
    ) -> c_int {
        API.store(api as *mut _, Ordering::Relaxed);
        // SAFETY: db is the connection SQLite is loading us into.
        unsafe {
            slot::<CreateFunction>(CREATE_FUNCTION)(
                db, c"parse_number".as_ptr(), 1, FLAGS, core::ptr::null_mut(),
                Some(parse_number_func), None, None,
            )
        }
    }

    #[cfg(feature = "nostd")]
    mod nostd {
        use super::*;
        use core::alloc::{GlobalAlloc, Layout};

        struct SqliteAlloc;
        // SAFETY: sqlite3_malloc returns 8-byte-aligned memory or NULL;
        // larger alignments are refused (NULL), which GlobalAlloc permits.
        unsafe impl GlobalAlloc for SqliteAlloc {
            unsafe fn alloc(&self, l: Layout) -> *mut u8 {
                if l.align() > 8 || l.size() > c_int::MAX as usize {
                    return core::ptr::null_mut();
                }
                unsafe { slot::<unsafe extern "C" fn(c_int) -> *mut c_void>(MALLOC)(l.size() as c_int) as *mut u8 }
            }
            unsafe fn dealloc(&self, p: *mut u8, _: Layout) {
                unsafe { slot::<unsafe extern "C" fn(*mut c_void)>(FREE)(p as *mut c_void) }
            }
        }
        #[global_allocator]
        static A: SqliteAlloc = SqliteAlloc;

        #[panic_handler]
        fn panic(_: &core::panic::PanicInfo) -> ! {
            extern "C" {
                fn abort() -> !;
            }
            // SAFETY: abort() never returns and has no preconditions.
            unsafe { abort() }
        }

        // Round 5: satisfies `core`'s reference to the personality in non-LTO
        // builds; the crate aborts on panic, so it is never called.
        #[cfg(feature = "eh-stub")]
        #[no_mangle]
        pub extern "C" fn rust_eh_personality() {}
    }
}
