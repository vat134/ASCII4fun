# Bundled FIGfonts

The initial catalog includes 39 fonts from [patorjk/figlet.js at commit `d29f4c185973b745100b7b23d6ba6e2cdf764fb2`](https://github.com/patorjk/figlet.js/tree/d29f4c185973b745100b7b23d6ba6e2cdf764fb2/fonts), retrieved 2026-11-07. Local filenames use kebab case. No figlet.js renderer is used by the product.

The initial selection required a FIGfont v2 signature, explicit MIT, WTFPL-2.0 or FIGfont modification permission in the original header, successful bounded parsing, and `ASCII Text` output matching the reference. The later full TAAG selection is a local compatibility implementation with unresolved distribution terms recorded in `catalog-audit.md`. The upstream collection's MIT notice and complete original font headers ship in [font-licenses.txt](font-licenses.txt). The headers retain their individual authors and conditions; they are also present in each font asset.

The original six fonts remain byte-for-byte unchanged. 11 legacy files were re-encoded from ISO-8859-1 to UTF-8, with an encoding note added to their comment header; glyphs and layout are unchanged. Original and packaged hashes are recorded below. Other retained assets are unchanged; Pagga has the signature adaptation documented below. Both .NET assemblies embed the same files.

| Font                   | File                         | Header permission  | Encoding change                    |
| ---------------------- | ---------------------------- | ------------------ | ---------------------------------- |
| Linguaholic Neon       | `linguaholic-neon.flf`       | MIT                | None                               |
| Linguaholic Rounded    | `linguaholic-rounded.flf`    | MIT                | None                               |
| Linguaholic Mini Block | `linguaholic-mini-block.flf` | MIT                | None                               |
| Linguaholic Shadow 3D  | `linguaholic-shadow-3d.flf`  | MIT                | None                               |
| ANSI Compact           | `ansi-compact.flf`           | MIT                | None                               |
| Classy                 | `classy.flf`                 | MIT                | None                               |
| Pagga                  | `pagga.flf`                  | WTFPL-2.0          | Signature only: `tlf2a` to `flf2a` |
| Avatar                 | `avatar.flf`                 | FIGfont permission | None                               |
| Big                    | `big.flf`                    | FIGfont permission | None                               |
| Bigfig                 | `bigfig.flf`                 | FIGfont permission | None                               |
| Block                  | `block.flf`                  | FIGfont permission | None                               |
| Blocks                 | `blocks.flf`                 | FIGfont permission | ISO-8859-1 to UTF-8                |
| Braced                 | `braced.flf`                 | FIGfont permission | None                               |
| Broadway KB            | `broadway-kb.flf`            | FIGfont permission | ISO-8859-1 to UTF-8                |
| Chiseled               | `chiseled.flf`               | FIGfont permission | ISO-8859-1 to UTF-8                |
| Coder Mini             | `coder-mini.flf`             | MIT                | None                               |
| Crazy                  | `crazy.flf`                  | FIGfont permission | ISO-8859-1 to UTF-8                |
| Doom                   | `doom.flf`                   | FIGfont permission | None                               |
| Double Shorts          | `double-shorts.flf`          | FIGfont permission | None                               |
| Epic                   | `epic.flf`                   | FIGfont permission | None                               |
| Font Font              | `font-font.flf`              | MIT                | None                               |
| Ghost                  | `ghost.flf`                  | FIGfont permission | ISO-8859-1 to UTF-8                |
| Ghoulish               | `ghoulish.flf`               | FIGfont permission | ISO-8859-1 to UTF-8                |
| Graceful               | `graceful.flf`               | FIGfont permission | None                               |
| Impossible             | `impossible.flf`             | FIGfont permission | ISO-8859-1 to UTF-8                |
| Lean                   | `lean.flf`                   | FIGfont permission | None                               |
| Lil Devil              | `lil-devil.flf`              | FIGfont permission | ISO-8859-1 to UTF-8                |
| Script                 | `script.flf`                 | FIGfont permission | None                               |
| Slant                  | `slant.flf`                  | FIGfont permission | None                               |
| Slant Relief           | `slant-relief.flf`           | FIGfont permission | None                               |
| Small                  | `small.flf`                  | FIGfont permission | None                               |
| Small Script           | `small-script.flf`           | FIGfont permission | None                               |
| Small Slant            | `small-slant.flf`            | FIGfont permission | None                               |
| Soft                   | `soft.flf`                   | FIGfont permission | ISO-8859-1 to UTF-8                |
| Speed                  | `speed.flf`                  | FIGfont permission | None                               |
| Standard               | `standard.flf`               | FIGfont permission | None                               |
| Train                  | `train.flf`                  | FIGfont permission | ISO-8859-1 to UTF-8                |
| Varsity                | `varsity.flf`                | FIGfont permission | ISO-8859-1 to UTF-8                |
| Wavy                   | `wavy.flf`                   | FIGfont permission | None                               |

## Audit exclusions

The pinned collection contains 332 top-level font assets. Ninety have an explicit supported permission statement and a `flf2a` signature. Of these, 41 fail current strict parser bounds or shape checks, and Mini, Shadow and Small Shadow differ from the reference default layout. Those 44 remain excluded rather than silently changing parsing or rendering semantics. TOIlet (`tlf2a`) and fonts without a sufficiently clear permission statement remain outside this bundle. The owner can remove catalog entries after visual review; inclusion is not an aesthetic ranking.

## Asset SHA-256

`upstream` hashes identify the original bytes; `packaged` hashes identify the embedded UTF-8 assets.

```text
pagga.flf
  upstream AC5693A0D48E73BC0EF816755FCB0FF04631FCC0A40ED35F22E21DFDAFBBEDE2
  packaged F8A3C12F969C52C9E3D2A6EA34E1C65E05D71C314CA6BAD1BE9CDA189FB9BFC7
linguaholic-neon.flf
  upstream 9D2127F761BD8A319BDDB336A6F866CC46B3B81ED873C4936E53569D5E353D89
  packaged 9D2127F761BD8A319BDDB336A6F866CC46B3B81ED873C4936E53569D5E353D89
linguaholic-rounded.flf
  upstream 062B5289E00343B3CEF971F72FCCD665E6743E9CDC6C87A42E542B6FCE596C82
  packaged 062B5289E00343B3CEF971F72FCCD665E6743E9CDC6C87A42E542B6FCE596C82
linguaholic-mini-block.flf
  upstream 0021532634ACC42E50B69B35DDA71AB451B23E6CDEF305CDE5B1DB986BA6689F
  packaged 0021532634ACC42E50B69B35DDA71AB451B23E6CDEF305CDE5B1DB986BA6689F
linguaholic-shadow-3d.flf
  upstream 22E08F610ECC93E160ECB6772327CC3D642A44479A4E9F91193173916BF4338C
  packaged 22E08F610ECC93E160ECB6772327CC3D642A44479A4E9F91193173916BF4338C
ansi-compact.flf
  upstream 7725D789F12F20F854A2D0FB6F23DF3080FEFD0753E94055F2078B3853AFE30F
  packaged 7725D789F12F20F854A2D0FB6F23DF3080FEFD0753E94055F2078B3853AFE30F
classy.flf
  upstream C738EE428830B85BD7CDBE3EDC7A296F1F1540B73910EE61756933EC43E06998
  packaged C738EE428830B85BD7CDBE3EDC7A296F1F1540B73910EE61756933EC43E06998
avatar.flf
  upstream 3550E42B25DF4ECBE98CB54E71AB32BF3D7772B9A49131295C4F40897ED22F8C
  packaged 3550E42B25DF4ECBE98CB54E71AB32BF3D7772B9A49131295C4F40897ED22F8C
big.flf
  upstream 3CDF2DD15945C4F3F04D9A0F75724AFBBCEFEF172332A4301F72E94DCF62971F
  packaged 3CDF2DD15945C4F3F04D9A0F75724AFBBCEFEF172332A4301F72E94DCF62971F
bigfig.flf
  upstream CE44E1DBCB6700E9E0790BE7A7A5E27D7482CF989D00EBCD147C36A2CB9415A5
  packaged CE44E1DBCB6700E9E0790BE7A7A5E27D7482CF989D00EBCD147C36A2CB9415A5
block.flf
  upstream 22D141018C5CD9456105992DA68D51C3647A31500A3500DDA2828956279D9F79
  packaged 22D141018C5CD9456105992DA68D51C3647A31500A3500DDA2828956279D9F79
blocks.flf
  upstream EBED66F57EEA6666BA8CC6B0887FDF6633DA46E29FC4829503E01DC8426A2AD8
  packaged 57F217A810580C820247EC0D7658CCB62C6A85B02A2BEA871EA6DB2D3C7818B7
braced.flf
  upstream DE2C3B682B3B2FD9CA33B8FDCD691A590780A439EAD2DB969C5F7BB47AC7810D
  packaged DE2C3B682B3B2FD9CA33B8FDCD691A590780A439EAD2DB969C5F7BB47AC7810D
broadway-kb.flf
  upstream C0469BA01AA811B794185BD50689DC79F6BF98C0970D9E4858BC6525BDD0B7FA
  packaged 71E31D1E9C2C7A156216915E63E599F573FD54940B1B5205C23DF368D9637A56
chiseled.flf
  upstream 8DF4229332EB853D3443C41C890E5C99F60142B605A3DC832D2F3C0B067E149A
  packaged 503BB5A17791036AEA2F6346BE94CE69696E566E6F6A396C0BDE9B0775F2C271
coder-mini.flf
  upstream 08857103CCA94C8C3F515875AF04389EC90F926876973C13CA11756C7D724592
  packaged 08857103CCA94C8C3F515875AF04389EC90F926876973C13CA11756C7D724592
crazy.flf
  upstream 5E007F96A44F72DC04B5C60936E0E35DBC6177BE7F81843666BDEBCF89FD29D8
  packaged 78B306A1088D895C4BD54669CBF75A5FD4F7016B112C5DF48C9753CB857A5C3A
doom.flf
  upstream 3D8FE9963526329FF9D5414A97B0F47E3A852D2F288A693F2938730F5A230E75
  packaged 3D8FE9963526329FF9D5414A97B0F47E3A852D2F288A693F2938730F5A230E75
double-shorts.flf
  upstream 58097DE08625651D60FDBF7B24762DACEF68C3767294AD1A236236A375E438DF
  packaged 58097DE08625651D60FDBF7B24762DACEF68C3767294AD1A236236A375E438DF
epic.flf
  upstream 7F38796CDCBC746B42BA68049A74B1359FBAEE776BD90FF5B1A2A85B75BF9226
  packaged 7F38796CDCBC746B42BA68049A74B1359FBAEE776BD90FF5B1A2A85B75BF9226
font-font.flf
  upstream 4CCCED1E2E76BA09E966BBE09B9BE217C1773975C9C977FA09C7E004CFD4CEA3
  packaged 4CCCED1E2E76BA09E966BBE09B9BE217C1773975C9C977FA09C7E004CFD4CEA3
ghost.flf
  upstream 644B0F501196F824282E49EA94AF67FA5684EEC1562E8311D921C51F9E28E184
  packaged 1A48D60B88FD0C2EE9446D8B5A4B342128F6E5FDF84628B7E93A8DD2A81B3C46
ghoulish.flf
  upstream 66916EF886F2D2D73DFD940A938B724613F21EB6B74E1556A430E89D433F4668
  packaged F122DCD5D8E8B74EC895801D7C581DC76A51437C235B98C4DFEF26B135F62DE5
graceful.flf
  upstream B9B61BB9B68601F40ED72092585DE738B890618DD2E3951742D6277EADD25228
  packaged B9B61BB9B68601F40ED72092585DE738B890618DD2E3951742D6277EADD25228
impossible.flf
  upstream 73CF9900CA0D3B7E7BEFEB86608D97CBEE1795692FBD044A3576A71481C1F011
  packaged 9E94A7C018F76EA398CFBBB787E2CB8DBEC77967AE5A6D038AE76E760BBFA50C
lean.flf
  upstream 7FA4B849244051A7E241A7CC07DF27FD0FA378E02658B741CBD29CD3F17673C4
  packaged 7FA4B849244051A7E241A7CC07DF27FD0FA378E02658B741CBD29CD3F17673C4
lil-devil.flf
  upstream 93BB9E5F28209FB26FCE094249A044010C3D4EFDF4A59F6DFD7A883CC65E4966
  packaged DDF5EA50DD791B376359AF7FCFD920672FE7C7CD710F7619F4D80E5331EAF4B3
script.flf
  upstream D849D3C46D6AF833FB722AF017A2DBC99042602F67BD2D4B23EB305F4D4B8CC7
  packaged D849D3C46D6AF833FB722AF017A2DBC99042602F67BD2D4B23EB305F4D4B8CC7
slant.flf
  upstream 0A1F6EBFA9B0A1658107765D5273F537E2A626C79A6FB431E1CA1E5330A74F2A
  packaged 0A1F6EBFA9B0A1658107765D5273F537E2A626C79A6FB431E1CA1E5330A74F2A
slant-relief.flf
  upstream 010496378B233C8FBB728D1F78874C03C8D1D0BF12239D5821296CB4DF4CDA7B
  packaged 010496378B233C8FBB728D1F78874C03C8D1D0BF12239D5821296CB4DF4CDA7B
small.flf
  upstream 6326D8A718CB57689D5EAA98D301B9297EF6F6300279635B901532A2F3D6AADF
  packaged 6326D8A718CB57689D5EAA98D301B9297EF6F6300279635B901532A2F3D6AADF
small-script.flf
  upstream 9BFC87722314D13654CDACE4C9B6D6F0D28CFE712BDEECFD58F3B2CFEF39E2BD
  packaged 9BFC87722314D13654CDACE4C9B6D6F0D28CFE712BDEECFD58F3B2CFEF39E2BD
small-slant.flf
  upstream 0AE40E029CC613468153816A8DF9933451043D09C23604E914A677A87D0BBF91
  packaged 0AE40E029CC613468153816A8DF9933451043D09C23604E914A677A87D0BBF91
soft.flf
  upstream FB93498FB2341B98557CE25792EFA9693305AF433C2A9F847A7B13767C2F5201
  packaged D048937130A76822750BDB5D69FF8EAAB9BD42A86A8216104E2E85733AB68EFC
speed.flf
  upstream D33427186B3D9029BE25B69A4445D733F6C78AEEA524B0AB78C600CB52FAFE19
  packaged D33427186B3D9029BE25B69A4445D733F6C78AEEA524B0AB78C600CB52FAFE19
standard.flf
  upstream 44573A1B2145DFDF0110B6A2D3D98BDC47A98CCA50795BD7B78278EE5CA96F79
  packaged 44573A1B2145DFDF0110B6A2D3D98BDC47A98CCA50795BD7B78278EE5CA96F79
train.flf
  upstream B73B3C94F1A6167B7894EEFF757FED34B226D0591055EC00519B0F97A6765D13
  packaged 18DCF6198C460C344B4C005E46F2ED6DFD463605A1E1DD97C87321F9E5BAC001
varsity.flf
  upstream 96B103D68065A448DCC4E5A50533886EABAB6C9A2FF40195EFC772802D02070B
  packaged 1915D9BE8864DF533524B8B12AAB7DD243A61D2CEEB43062A4692D8FAFACB783
wavy.flf
  upstream F31E0CAA8066B3C22009CFA089A3E7D5D6462993373BE1A1349DFC4939ECEEAC
  packaged F31E0CAA8066B3C22009CFA089A3E7D5D6462993373BE1A1349DFC4939ECEEAC
```

## Compatibility evidence

The behavioral contract is the [FIGfont Version 2 specification](https://github.com/cmatsuoka/figlet/blob/master/figfont.txt), especially header interpretation, required characters, code tags, hardblanks and horizontal layout. This slice follows bundled font defaults. The C# renderer, glyph coverage and work limits are unchanged by the catalog expansion.

Golden checks in `figlet-converter-tests.cs` render `ASCII Text` with [figlet.js 1.12.0](https://www.npmjs.com/package/figlet/v/1.12.0) as a reference tool, using these exact font bytes, no width limit and default layout. Before hashing, pad every reference output row on the right with ordinary spaces to the maximum row width measured in Unicode scalars. Encode the resulting LF-separated rectangle as UTF-8, without a final newline, then compute SHA-256. A small literal `Hi` golden also preserves visible output and trailing spaces. Authored parser/layout fixtures independently exercise the supported controlled horizontal smushing rules, universal smushing, hardblanks, right-to-left direction, duplicate code-tag replacement, supplementary scalars, malformed fonts and work bounds.

Loic fonts contain more code-tagged characters than their declared `Codetag_Count` of zero, and some rows exceed the declared `Max_Length`. Those two fields are validated as bounded metadata, not trusted allocation or truncation sizes. The parser bounds actual rows and glyph count. This preserves the original assets and matches their reference rendering. Repeated code tags intentionally replace earlier glyphs, as the specification requires.

The parser is internal and accepts at most 1,048,576 UTF-16 code units, 32 rows per glyph, 256 cells per glyph row, 256 comments and 1,024 glyph records including replacements. It supports the 102 required glyph slots and decimal/octal/hexadecimal tags; rows must have consistent widths. Public user-font loading is deferred.

`FigletConverter.Convert` accepts nonempty, well-formed Unicode text with at most 256 scalars and 8 lines after CRLF/CR normalization to LF. Lines stack without vertical fitting or smushing. Output is an `AsciiCanvas` on black, with a selectable foreground color (white by default), padded to a rectangle, without automatic wrapping, at most 4,096 columns and 32,768 cells. Unsupported or empty glyphs produce an explicit `ArgumentException` identifying the scalar; the font's code-zero fallback is deliberately not used. This policy avoids silently losing or replacing user text. Browser raster admission may impose a smaller pixel-side limit.

Vertical layout, `.tlf`, colored font extensions, font uploads, layout overrides, API/CLI text commands and text export controls remain outside this slice.

## Learning evidence

- Objective: parse FIGfont layout and hardblanks into the existing shared `Rune` canvas without a second browser algorithm.
- Native capability: .NET 10 [manifest resources](https://learn.microsoft.com/en-us/dotnet/api/system.reflection.assembly.getmanifestresourcestream?view=net-10.0) bundle the audited bytes with each assembly; explicit logical names keep browser/native lookup identical. [Rune.DecodeFromUtf16](https://learn.microsoft.com/en-us/dotnet/api/system.text.rune.decodefromutf16?view=net-10.0) detects malformed UTF-16 rather than silently replacing it.
- Experiment: all 39 `ASCII Text` results match independent figlet.js 1.12.0 reference hashes after rectangular padding. Asset inspection identified the advisory metadata discrepancy described above.
- Takeaway: a glyph cell is one Unicode scalar, not one C# `char`; hardblanks remain occupied layout cells until composition is complete, when they become visible spaces.
- Deviation: explicit missing-glyph rejection replaces the specification's optional code-zero fallback/silent omission. Actual bounded row/glyph data governs parsing of the two advisory header fields.

## Gallery memory

Only card thumbnails are filtered down to at most 384 by 160 pixels with the browser's [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas). Cards are rendered on visibility, behind pending text edits. At most 32 thumbnails are retained (7.5 MiB of RGBA payload, excluding runtime and display canvases). Temporary canvases are released after each font. Main preview results and native PNG rendering retain their full raster. Metadata and categories remain owned by the C# catalog; no alternate FIGlet layout is implemented in the browser.

## Owner catalog selection (2026-11-08)

Removed Fire Font-k, Fire Font-s, Horizontal Left, Horizontal Right, Mirror, Morse, Morse2 and Test1, including their embedded assets, headers and golden entries. At that stage no bundled Text font contained Braille scalars; the later selection explicitly restores Small Braille. Media Braille is retained at the owner's explicit request. Added Pagga by Sam Hocevar and pagga from the same pinned upstream commit. Its header grants WTFPL version 2; the complete [upstream license](https://github.com/cacalabs/toilet/blob/master/COPYING) is included in font-licenses.txt.

Pagga uses a TOIlet signature with otherwise compatible FIGfont data. Only the first byte is adapted from `tlf2a` to `flf2a`; glyphs, comments and layout remain unchanged. The strict parser is unchanged and general TOIlet input support remains deferred. Compare the packaged result against figlet.js 1.12.0 and the owner's literal three-line `AXONIX TOOLS` example.

## Owner TAAG selection (2026-11-08)

The first expansion added twelve additional fonts from the same pinned source that passed the header-permission and independent default-layout checks, bringing the catalog to 51. The source headers remain intact. Runtime parser rules are unchanged. Packaged data uses UTF-8, explicit private-use row endmarks and space-padded rectangular glyph rows; DEL hardblanks become U+E000. TOIlet signatures are adapted to `flf2a`. Small Braille's invalid baseline (3 for a two-row font) is corrected to 2; the renderer does not use the baseline for layout. None of these substitutions appears in generated output.

| Font          | Original SHA-256                                                   | Packaged SHA-256                                                   |
| ------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 3D Diagonal   | `0ac661d00e3132e0b2e9b9f2e23c28971a6b75b03e9a698ea6c5243e387e2e97` | `9cb387ee14aab213f11bb1623720559487a9da0b2a51d17bc99a7d69ec0158ed` |
| Bear          | `124f873ce24fe22512b4b42bc22a658005e9aaf3ba3069ea77f4c195528fdf1c` | `dc11047b01c0502c00f903d943f16d6e841fcefb82b7665d05a211266c843e7c` |
| Emboss        | `e1e5179817e06a39ec37ee66be627e39c3184921d13cb54327aea36f805813b6` | `29d5bcdec27868ba65688d2508890abc4020000a5e06af07e11052a633dc01ac` |
| Future Smooth | `5dd4a5add7e3c8a76b9a0c6fce69b64292d2efd634f86882ebb3e217741a20f4` | `1e3366f3007e34dea88dc56d91bc830bed012417d938259d55119df2a0d3a72e` |
| Future        | `d3f82bef2625e99b750e81f230d5f4d2b122eb621250e94d2c5317da3e039682` | `72fa8cad0c0769df21b740984f53472f36d06a52aa7a5280777afc0e4ba6170b` |
| Glenyn        | `47322f64059e1bc225e3d021f8859eec52e6b71ee93424faf6e7cac61fb89377` | `b5a951a4b1894375bccb9f295188c1be1f11c609fb96e8d4751f093af0cd737f` |
| Letter        | `fb19317d1bc7c3c398b31ea26947aecc905f1dce8ce39bbfe7d9c7ece1d9c7f7` | `061061c8f661bc94a4af828f36bdaac5f02aac775bc7bd587a2164d9aa7603ec` |
| Line Blocks   | `61436a0f778f5f6d1b3f8a6686399426bfd5e47c39c3b76aed37f1bec8fbbe67` | `6d84f33a736f265575ab59e10e172ac1131416c903ba3b76d124b9e836221ab3` |
| Modular       | `dafe1d33dd9dfaf1fb134a97712bbdd1de5980bfea7408c689da9958a04114d4` | `8bba64b6222f332410b136d35488156664eb56ff18b2e063c26735def0b04e7f` |
| Muzzle        | `a75135984e6e3f21bd18a9d4c0250e641df0f803fa2228ff8276e8d72c183427` | `6601948e07d23aa592ead57db32773152635cf83ec41bf5284a4aa78c5043a33` |
| Small Braille | `b556845b33323a2100b79b2a8192f925c4a712a809a5ddc4be7669cef1f60d00` | `4f13bd00d9c2dd44317da45630b7f30100a9eb6b8d8d82245885dcd6f929ae72` |
| Sweet         | `670b80ea12f67966b12a7c27a76c1e84d7361486e1d38ca1558519d2a41ff8b3` | `22bf5b52a107b2d18f3e303cc225fc34ff045ce9651ee3055c68eb21392decc9` |

The complete owner selection and unresolved items are recorded in [catalog-audit.md](catalog-audit.md). Missing individual permissions are not inferred from the renderer or collection license. The local implementation preserves native TheDraw foreground/background colors and supports whole-font palette replacements through the shared engine. The native foreground override remains available separately. Unresolved individual permissions still limit redistribution; technical support does not imply clearance.

## Full selected catalog (2026-11-08)

The later expansion implements all 208 selected entries (227 total). See `catalog-audit.md` for compatibility and distribution status, and `selected-assets.json` for each selected source/packaged SHA-256 and TheDraw default variant. Original FIGfont comment headers are retained in `font-licenses.txt` even when an asset is normalized.

New FIGlet assets are decoded as UTF-8 or legacy ISO-8859-1, use explicit private-use endmarks, and retain ragged glyph rows where authored. TOIlet signatures become `flf2a`; this is bundled data adaptation, not general `.tlf` import support. DEL hardblanks become U+E000; legacy C1 glyph bytes in B1FF/Digital become their CP437 graphical scalars. Double's unsupported negative full-layout field becomes zero (reference full-width behavior); Georgi16's contradictory layout fields become explicit universal smushing (reference behavior). Parser limits remain 1 MiB and 256 columns per glyph; the code-tag limit increases from 1,024 to 4,096 for the selected ~3,000-glyph ASCII/Mono fonts. No glyph data is truncated.

TheDraw assets are exact single-record subsets of the original TAAG chunks, including their file/record headers and original CP437 glyph/color data. The shared C# reader supports outline, block and color records with bounds and terminator checks. The atdt collection/renderer at `e7a2a912fb76ec719708fa76c3ffa5986d10de1c` and TAAG parser were inspected as independent format references; their JavaScript renderer code is not part of the product. Font-specific author/permission information is absent from these binary records; no MIT font-author claim is inferred from a renderer license.
