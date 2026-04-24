module.exports = [
"[project]/frontend/node_modules/@noble/curves/esm/nist.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "p256",
    ()=>p256,
    "p256_hasher",
    ()=>p256_hasher,
    "p384",
    ()=>p384,
    "p384_hasher",
    ()=>p384_hasher,
    "p521",
    ()=>p521,
    "p521_hasher",
    ()=>p521_hasher,
    "secp256r1",
    ()=>secp256r1,
    "secp384r1",
    ()=>secp384r1,
    "secp521r1",
    ()=>secp521r1
]);
/**
 * Internal module for NIST P256, P384, P521 curves.
 * Do not use for now.
 * @module
 */ /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */ var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$hashes$2f$esm$2f$sha2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/@noble/hashes/esm/sha2.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$curves$2f$esm$2f$_shortw_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/@noble/curves/esm/_shortw_utils.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$curves$2f$esm$2f$abstract$2f$hash$2d$to$2d$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/@noble/curves/esm/abstract/hash-to-curve.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$curves$2f$esm$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/@noble/curves/esm/abstract/modular.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$curves$2f$esm$2f$abstract$2f$weierstrass$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/@noble/curves/esm/abstract/weierstrass.js [app-ssr] (ecmascript)");
;
;
;
;
;
const Fp256 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$curves$2f$esm$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Field"])(BigInt('0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff'));
const p256_a = Fp256.create(BigInt('-3'));
const p256_b = BigInt('0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b');
const p256 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$curves$2f$esm$2f$_shortw_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createCurve"])({
    a: p256_a,
    b: p256_b,
    Fp: Fp256,
    n: BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551'),
    Gx: BigInt('0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296'),
    Gy: BigInt('0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5'),
    h: BigInt(1),
    lowS: false
}, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$hashes$2f$esm$2f$sha2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sha256"]);
const secp256r1 = p256;
const p256_mapSWU = /* @__PURE__ */ (()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$curves$2f$esm$2f$abstract$2f$weierstrass$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mapToCurveSimpleSWU"])(Fp256, {
        A: p256_a,
        B: p256_b,
        Z: Fp256.create(BigInt('-10'))
    }))();
const p256_hasher = /* @__PURE__ */ (()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$curves$2f$esm$2f$abstract$2f$hash$2d$to$2d$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createHasher"])(secp256r1.ProjectivePoint, (scalars)=>p256_mapSWU(scalars[0]), {
        DST: 'P256_XMD:SHA-256_SSWU_RO_',
        encodeDST: 'P256_XMD:SHA-256_SSWU_NU_',
        p: Fp256.ORDER,
        m: 1,
        k: 128,
        expand: 'xmd',
        hash: __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$hashes$2f$esm$2f$sha2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sha256"]
    }))();
// Field over which we'll do calculations.
const Fp384 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$curves$2f$esm$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Field"])(BigInt('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000ffffffff'));
const p384_a = Fp384.create(BigInt('-3'));
// prettier-ignore
const p384_b = BigInt('0xb3312fa7e23ee7e4988e056be3f82d19181d9c6efe8141120314088f5013875ac656398d8a2ed19d2a85c8edd3ec2aef');
const p384 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$curves$2f$esm$2f$_shortw_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createCurve"])({
    a: p384_a,
    b: p384_b,
    Fp: Fp384,
    n: BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffc7634d81f4372ddf581a0db248b0a77aecec196accc52973'),
    Gx: BigInt('0xaa87ca22be8b05378eb1c71ef320ad746e1d3b628ba79b9859f741e082542a385502f25dbf55296c3a545e3872760ab7'),
    Gy: BigInt('0x3617de4a96262c6f5d9e98bf9292dc29f8f41dbd289a147ce9da3113b5f0b8c00a60b1ce1d7e819d7a431d7c90ea0e5f'),
    h: BigInt(1),
    lowS: false
}, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$hashes$2f$esm$2f$sha2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sha384"]);
const secp384r1 = p384;
const p384_mapSWU = /* @__PURE__ */ (()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$curves$2f$esm$2f$abstract$2f$weierstrass$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mapToCurveSimpleSWU"])(Fp384, {
        A: p384_a,
        B: p384_b,
        Z: Fp384.create(BigInt('-12'))
    }))();
const p384_hasher = /* @__PURE__ */ (()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$curves$2f$esm$2f$abstract$2f$hash$2d$to$2d$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createHasher"])(secp384r1.ProjectivePoint, (scalars)=>p384_mapSWU(scalars[0]), {
        DST: 'P384_XMD:SHA-384_SSWU_RO_',
        encodeDST: 'P384_XMD:SHA-384_SSWU_NU_',
        p: Fp384.ORDER,
        m: 1,
        k: 192,
        expand: 'xmd',
        hash: __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$hashes$2f$esm$2f$sha2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sha384"]
    }))();
// Field over which we'll do calculations.
const Fp521 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$curves$2f$esm$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Field"])(BigInt('0x1ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'));
const p521_a = Fp521.create(BigInt('-3'));
const p521_b = BigInt('0x0051953eb9618e1c9a1f929a21a0b68540eea2da725b99b315f3b8b489918ef109e156193951ec7e937b1652c0bd3bb1bf073573df883d2c34f1ef451fd46b503f00');
const p521 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$curves$2f$esm$2f$_shortw_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createCurve"])({
    a: p521_a,
    b: p521_b,
    Fp: Fp521,
    n: BigInt('0x01fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffa51868783bf2f966b7fcc0148f709a5d03bb5c9b8899c47aebb6fb71e91386409'),
    Gx: BigInt('0x00c6858e06b70404e9cd9e3ecb662395b4429c648139053fb521f828af606b4d3dbaa14b5e77efe75928fe1dc127a2ffa8de3348b3c1856a429bf97e7e31c2e5bd66'),
    Gy: BigInt('0x011839296a789a3bc0045c8a5fb42c7d1bd998f54449579b446817afbd17273e662c97ee72995ef42640c550b9013fad0761353c7086a272c24088be94769fd16650'),
    h: BigInt(1),
    lowS: false,
    allowedPrivateKeyLengths: [
        130,
        131,
        132
    ] // P521 keys are variable-length. Normalize to 132b
}, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$hashes$2f$esm$2f$sha2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sha512"]);
const secp521r1 = p521;
const p521_mapSWU = /* @__PURE__ */ (()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$curves$2f$esm$2f$abstract$2f$weierstrass$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mapToCurveSimpleSWU"])(Fp521, {
        A: p521_a,
        B: p521_b,
        Z: Fp521.create(BigInt('-4'))
    }))();
const p521_hasher = /* @__PURE__ */ (()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$curves$2f$esm$2f$abstract$2f$hash$2d$to$2d$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createHasher"])(secp521r1.ProjectivePoint, (scalars)=>p521_mapSWU(scalars[0]), {
        DST: 'P521_XMD:SHA-512_SSWU_RO_',
        encodeDST: 'P521_XMD:SHA-512_SSWU_NU_',
        p: Fp521.ORDER,
        m: 1,
        k: 256,
        expand: 'xmd',
        hash: __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$hashes$2f$esm$2f$sha2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sha512"]
    }))();
}),
"[project]/frontend/node_modules/@noble/curves/esm/p256.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * NIST secp256r1 aka p256.
 * @module
 */ /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */ __turbopack_context__.s([
    "encodeToCurve",
    ()=>encodeToCurve,
    "hashToCurve",
    ()=>hashToCurve,
    "p256",
    ()=>p256,
    "secp256r1",
    ()=>secp256r1
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$curves$2f$esm$2f$nist$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/@noble/curves/esm/nist.js [app-ssr] (ecmascript)");
;
;
const p256 = __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$curves$2f$esm$2f$nist$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["p256"];
const secp256r1 = __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$curves$2f$esm$2f$nist$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["p256"];
const hashToCurve = /* @__PURE__ */ (()=>__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$curves$2f$esm$2f$nist$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["p256_hasher"].hashToCurve)();
const encodeToCurve = /* @__PURE__ */ (()=>__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f40$noble$2f$curves$2f$esm$2f$nist$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["p256_hasher"].encodeToCurve)();
}),
];

//# sourceMappingURL=0r9g_%40noble_curves_esm_10krivf._.js.map