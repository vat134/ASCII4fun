# Selected TAAG catalog

All 208 requested entries are implemented locally: 101 FIGlet/TOIlet, 105 TheDraw families and two AOL Macro fonts. The full catalog has 227 entries, retaining 19 other fonts. One default authored variant is selected per TheDraw family, matching TAAG's first variant; this does not import every color variant.

Sources: [figlet.js pinned collection](https://github.com/patorjk/figlet.js/tree/d29f4c185973b745100b7b23d6ba6e2cdf764fb2/fonts), [TAAG Test All](https://patorjk.com/software/taag/#p=testall), [TheDraw format research](https://www.roysac.com/blog/2014/04/thedraw-fonts-file-tdf-specifications/). Data retrieved 2026-11-08. `selected-assets.json` records source/packaged hashes and default variants. `font-licenses.txt` preserves original FIGfont headers.

## Distribution status

Technical inclusion is complete; redistribution clearance is not. The figlet.js collection declares MIT, and the atdt/tdf-figlet renderer declares MIT, but neither is treated as proof that every original third-party font author granted those terms. Unknown individual terms below remain a release/distribution blocker. The local implementation must not be described as a fully cleared release or published before that is resolved.

## Compatibility

All 227 `ASCII Text` glyph layouts match independent figlet.js 1.12.0 or TAAG reference output. All 105 TheDraw color-cell grids also have independent hashes. Output is rectangular and preserves authored glyphs, spaces and colors; the native foreground override leaves glyphs and cell backgrounds unchanged. Whole-font palette replacements instead change matching authored foreground and cell-background colors simultaneously, preserving glyphs and the global canvas background. TheDraw uses uppercase lettering where a lowercase glyph is absent. Unsupported characters fail rather than disappearing.

X99/X992 retain their authored glyph layout and use the product's bundled fixed cell geometry, shared by preview and PNG. Their original design targeted legacy Arial; matching that proportional presentation or arbitrary chat fonts is not claimed. Moscow uses Latin input to produce Cyrillic-shaped lettering; it does not transliterate arbitrary Cyrillic input.

| Requested entry        | Asset ID                 | Individual permission evidence  |
| ---------------------- | ------------------------ | ------------------------------- |
| 3D Diagonal            | `3d-diagonal`            | FIGfont modification permission |
| Avatar                 | `avatar`                 | FIGfont modification permission |
| Big Money-ne           | `big-money-ne`           | Unresolved individual terms     |
| Big Money-nw           | `big-money-nw`           | Unresolved individual terms     |
| Big Money-se           | `big-money-se`           | Unresolved individual terms     |
| Big Money-sw           | `big-money-sw`           | Unresolved individual terms     |
| Big                    | `big`                    | FIGfont modification permission |
| Blocks                 | `blocks`                 | FIGfont modification permission |
| BlurVision ASCII       | `blurvision-ascii`       | Unresolved individual terms     |
| Bulbhead               | `bulbhead`               | Unresolved individual terms     |
| Doh                    | `doh`                    | Unresolved individual terms     |
| Doom                   | `doom`                   | FIGfont modification permission |
| Epic                   | `epic`                   | FIGfont modification permission |
| Graceful               | `graceful`               | FIGfont modification permission |
| JS Bracket Letters     | `js-bracket-letters`     | Unresolved individual terms     |
| Modular                | `modular`                | FIGfont modification permission |
| Ogre                   | `ogre`                   | Unresolved individual terms     |
| Rectangles             | `rectangles`             | Unresolved individual terms     |
| Shaded Blocky          | `shaded-blocky`          | Unresolved individual terms     |
| Slant                  | `slant`                  | FIGfont modification permission |
| Slant Relief           | `slant-relief`           | FIGfont modification permission |
| Small                  | `small`                  | FIGfont modification permission |
| Standard               | `standard`               | FIGfont modification permission |
| Star Wars              | `star-wars`              | Unresolved individual terms     |
| Sweet                  | `sweet`                  | FIGfont modification permission |
| Terrace                | `terrace`                | Unresolved individual terms     |
| Tmplr                  | `tmplr`                  | Unresolved individual terms     |
| Varsity                | `varsity`                | FIGfont modification permission |
| 3D-ASCII               | `3d-ascii`               | Unresolved individual terms     |
| ANSI Compact           | `ansi-compact`           | MIT                             |
| ANSI Regular           | `ansi-regular`           | Unresolved individual terms     |
| ANSI Shadow            | `ansi-shadow`            | Unresolved individual terms     |
| Bloody                 | `bloody`                 | Unresolved individual terms     |
| Classy                 | `classy`                 | MIT                             |
| Coder Mini             | `coder-mini`             | MIT                             |
| Delta Corps Priest 1   | `delta-corps-priest-1`   | Unresolved individual terms     |
| Electronic             | `electronic`             | Unresolved individual terms     |
| The Edge               | `the-edge`               | Unresolved individual terms     |
| ASCII 12               | `ascii-12`               | Unresolved individual terms     |
| ASCII 9                | `ascii-9`                | Unresolved individual terms     |
| Big ASCII 12           | `big-ascii-12`           | Unresolved individual terms     |
| Big ASCII 9            | `big-ascii-9`            | Unresolved individual terms     |
| Emboss                 | `emboss`                 | Unresolved individual terms     |
| Future                 | `future`                 | Unresolved individual terms     |
| Future Smooth          | `future-smooth`          | Unresolved individual terms     |
| Letter                 | `letter`                 | Unresolved individual terms     |
| Mono 12                | `mono-12`                | Unresolved individual terms     |
| Mono 9                 | `mono-9`                 | Unresolved individual terms     |
| Pagga                  | `pagga`                  | Unresolved individual terms     |
| Rebel                  | `rebel`                  | Unresolved individual terms     |
| Small Braille          | `small-braille`          | Unresolved individual terms     |
| 4Max                   | `4max`                   | Unresolved individual terms     |
| 5 Line Oblique         | `5-line-oblique`         | Unresolved individual terms     |
| Alligator              | `alligator`              | Unresolved individual terms     |
| Alligator2             | `alligator2`             | Unresolved individual terms     |
| AMC 3 Line             | `amc-3-line`             | Unresolved individual terms     |
| AMC AAA01              | `amc-aaa01`              | Unresolved individual terms     |
| AMC Slider             | `amc-slider`             | Unresolved individual terms     |
| Arrows                 | `arrows`                 | Unresolved individual terms     |
| B1FF                   | `b1ff`                   | FIGfont modification permission |
| Banner3                | `banner3`                | Unresolved individual terms     |
| Banner4                | `banner4`                | Unresolved individual terms     |
| Basic                  | `basic`                  | Unresolved individual terms     |
| Bear                   | `bear`                   | FIGfont modification permission |
| Bell                   | `bell`                   | Unresolved individual terms     |
| Braced                 | `braced`                 | FIGfont modification permission |
| Bright                 | `bright`                 | Unresolved individual terms     |
| Chunky                 | `chunky`                 | Unresolved individual terms     |
| Colossal               | `colossal`               | Unresolved individual terms     |
| Cyberlarge             | `cyberlarge`             | Unresolved individual terms     |
| Cybermedium            | `cybermedium`            | Unresolved individual terms     |
| Digital                | `digital`                | FIGfont modification permission |
| DOS Rebel              | `dos-rebel`              | Unresolved individual terms     |
| Double                 | `double`                 | Unresolved individual terms     |
| Dr Pepper              | `dr-pepper`              | Unresolved individual terms     |
| Fender                 | `fender`                 | Unresolved individual terms     |
| Fraktur                | `fraktur`                | Unresolved individual terms     |
| Georgi16               | `georgi16`               | Unresolved individual terms     |
| Georgia11              | `georgia11`              | Unresolved individual terms     |
| Ghoulish               | `ghoulish`               | FIGfont modification permission |
| Glenyn                 | `glenyn`                 | Unresolved individual terms     |
| Greek                  | `greek`                  | Unresolved individual terms     |
| JS Stick Letters       | `js-stick-letters`       | Unresolved individual terms     |
| Kban                   | `kban`                   | Unresolved individual terms     |
| Keyboard               | `keyboard`               | Unresolved individual terms     |
| Larry 3D               | `larry-3d`               | Unresolved individual terms     |
| Larry 3D 2             | `larry-3d-2`             | Unresolved individual terms     |
| Line Blocks            | `line-blocks`            | FIGfont modification permission |
| Linguaholic Mini Block | `linguaholic-mini-block` | MIT                             |
| Linguaholic Neon       | `linguaholic-neon`       | MIT                             |
| Linguaholic Shadow 3D  | `linguaholic-shadow-3d`  | MIT                             |
| Mini                   | `mini`                   | FIGfont modification permission |
| Moscow                 | `moscow`                 | Unresolved individual terms     |
| Muzzle                 | `muzzle`                 | FIGfont modification permission |
| NScript                | `nscript`                | Unresolved individual terms     |
| Puffy                  | `puffy`                  | Unresolved individual terms     |
| Reverse                | `reverse`                | Unresolved individual terms     |
| Roman                  | `roman`                  | Unresolved individual terms     |
| Rowan Cap              | `rowan-cap`              | Unresolved individual terms     |
| Small Keyboard         | `small-keyboard`         | Unresolved individual terms     |
| Stforek                | `stforek`                | Unresolved individual terms     |
| X99                    | `x99`                    | Unresolved individual terms     |
| X992                   | `x992`                   | Unresolved individual terms     |
| 1911                   | `tdf-1911`               | Unresolved individual terms     |
| 208                    | `tdf-208`                | Unresolved individual terms     |
| 4Max Col               | `tdf-4max-col`           | Unresolved individual terms     |
| ACID 3D                | `tdf-acid-3d`            | Unresolved individual terms     |
| Acidscape2             | `tdf-acidscape2`         | Unresolved individual terms     |
| Acidtronics            | `tdf-acidtronics`        | Unresolved individual terms     |
| Acrylic                | `tdf-acrylic`            | Unresolved individual terms     |
| ADarkness              | `tdf-adarkness`          | Unresolved individual terms     |
| Adome                  | `tdf-adome`              | Unresolved individual terms     |
| Adrena                 | `tdf-adrena`             | Unresolved individual terms     |
| AfterHours             | `tdf-afterhours`         | Unresolved individual terms     |
| Ansiltr3               | `tdf-ansiltr3`           | Unresolved individual terms     |
| Ansiltr4               | `tdf-ansiltr4`           | Unresolved individual terms     |
| Ansiltr5               | `tdf-ansiltr5`           | Unresolved individual terms     |
| Beyond2                | `tdf-beyond2`            | Unresolved individual terms     |
| Black                  | `tdf-black`              | Unresolved individual terms     |
| Blade                  | `tdf-blade`              | Unresolved individual terms     |
| Block 3D               | `tdf-block-3d`           | Unresolved individual terms     |
| Blood-LgCol            | `tdf-blood-lgcol`        | Unresolved individual terms     |
| BloodSmlCol            | `tdf-bloodsmlcol`        | Unresolved individual terms     |
| Bloody                 | `tdf-bloody`             | Unresolved individual terms     |
| Blunder                | `tdf-blunder`            | Unresolved individual terms     |
| Blunder Smal           | `tdf-blunder-smal`       | Unresolved individual terms     |
| Board                  | `tdf-board`              | Unresolved individual terms     |
| Bodily                 | `tdf-bodily`             | Unresolved individual terms     |
| BoilingPoint           | `tdf-boilingpoint`       | Unresolved individual terms     |
| BoldMedium             | `tdf-boldmedium`         | Unresolved individual terms     |
| Bollux                 | `tdf-bollux`             | Unresolved individual terms     |
| Boner                  | `tdf-boner`              | Unresolved individual terms     |
| BrainDmg               | `tdf-braindmg`           | Unresolved individual terms     |
| Brotherhood            | `tdf-brotherhood`        | Unresolved individual terms     |
| Circuits               | `tdf-circuits`           | Unresolved individual terms     |
| Closed                 | `tdf-closed`             | Unresolved individual terms     |
| Coder                  | `tdf-coder`              | Unresolved individual terms     |
| ColoredHard            | `tdf-coloredhard`        | Unresolved individual terms     |
| ColorRounded           | `tdf-colorrounded`       | Unresolved individual terms     |
| ColossCol              | `tdf-colosscol`          | Unresolved individual terms     |
| Compact                | `tdf-compact`            | Unresolved individual terms     |
| Crewel                 | `tdf-crewel`             | Unresolved individual terms     |
| Crimson                | `tdf-crimson`            | Unresolved individual terms     |
| DarkCS3D               | `tdf-darkcs3d`           | Unresolved individual terms     |
| Darklands              | `tdf-darklands`          | Unresolved individual terms     |
| DarkRealm              | `tdf-darkrealm`          | Unresolved individual terms     |
| DeathStar              | `tdf-deathstar`          | Unresolved individual terms     |
| Delusion               | `tdf-delusion`           | Unresolved individual terms     |
| Destinatn              | `tdf-destinatn`          | Unresolved individual terms     |
| Destruct               | `tdf-destruct`           | Unresolved individual terms     |
| Eclipse                | `tdf-eclipse`            | Unresolved individual terms     |
| Eclipse2               | `tdf-eclipse2`           | Unresolved individual terms     |
| Elusive                | `tdf-elusive`            | Unresolved individual terms     |
| File                   | `tdf-file`               | Unresolved individual terms     |
| Font 20                | `tdf-font-20`            | Unresolved individual terms     |
| Forbidden              | `tdf-forbidden`          | Unresolved individual terms     |
| Forgotten              | `tdf-forgotten`          | Unresolved individual terms     |
| Foundation             | `tdf-foundation`         | Unresolved individual terms     |
| Friendship             | `tdf-friendship`         | Unresolved individual terms     |
| Funderbird             | `tdf-funderbird`         | Unresolved individual terms     |
| Fungi                  | `tdf-fungi`              | Unresolved individual terms     |
| Future                 | `tdf-future`             | Unresolved individual terms     |
| Gangland               | `tdf-gangland`           | Unresolved individual terms     |
| Garden                 | `tdf-garden`             | Unresolved individual terms     |
| Gloom                  | `tdf-gloom`              | Unresolved individual terms     |
| Grand                  | `tdf-grand`              | Unresolved individual terms     |
| GreenChaos             | `tdf-greenchaos`         | Unresolved individual terms     |
| Hobbes                 | `tdf-hobbes`             | Unresolved individual terms     |
| ICE Blue               | `tdf-ice-blue`           | Unresolved individual terms     |
| Ice Zone               | `tdf-ice-zone`           | Unresolved individual terms     |
| Illusion 2             | `tdf-illusion-2`         | Unresolved individual terms     |
| Illusion Chr           | `tdf-illusion-chr`       | Unresolved individual terms     |
| ImgMnuSet              | `tdf-imgmnuset`          | Unresolved individual terms     |
| Inch                   | `tdf-inch`               | Unresolved individual terms     |
| Insomiac               | `tdf-insomiac`           | Unresolved individual terms     |
| Intentions             | `tdf-intentions`         | Unresolved individual terms     |
| Intoxicatn             | `tdf-intoxicatn`         | Unresolved individual terms     |
| Iridium                | `tdf-iridium`            | Unresolved individual terms     |
| Juice                  | `tdf-juice`              | Unresolved individual terms     |
| Kevin3                 | `tdf-kevin3`             | Unresolved individual terms     |
| KeWl                   | `tdf-kewl`               | Unresolved individual terms     |
| KolOsAl                | `tdf-kolosal`            | Unresolved individual terms     |
| mabus1                 | `tdf-mabus1`             | Unresolved individual terms     |
| Magazine               | `tdf-magazine`           | Unresolved individual terms     |
| Messages               | `tdf-messages`           | Unresolved individual terms     |
| Midnight               | `tdf-midnight`           | Unresolved individual terms     |
| Nyndee                 | `tdf-nyndee`             | Unresolved individual terms     |
| Optical                | `tdf-optical`            | Unresolved individual terms     |
| Outline                | `tdf-outline`            | Unresolved individual terms     |
| Psycosis               | `tdf-psycosis`           | Unresolved individual terms     |
| Radiance               | `tdf-radiance`           | Unresolved individual terms     |
| RomanNS                | `tdf-romanns`            | Unresolved individual terms     |
| Rounded                | `tdf-rounded`            | Unresolved individual terms     |
| Silver                 | `tdf-silver`             | Unresolved individual terms     |
| SiP_HoPeLeSS           | `tdf-sip-hopeless`       | Unresolved individual terms     |
| Stats RS               | `tdf-stats-rs`           | Unresolved individual terms     |
| SuperTurbo             | `tdf-superturbo`         | Unresolved individual terms     |
| Tech                   | `tdf-tech`               | Unresolved individual terms     |
| Termite                | `tdf-termite`            | Unresolved individual terms     |
| ThickOutline           | `tdf-thickoutline`       | Unresolved individual terms     |
| ThievesOld             | `tdf-thievesold`         | Unresolved individual terms     |
| THiS!                  | `tdf-this`               | Unresolved individual terms     |
| Tiny                   | `tdf-tiny`               | Unresolved individual terms     |
| Tribes                 | `tdf-tribes`             | Unresolved individual terms     |
| Tusse                  | `tdf-tusse`              | Unresolved individual terms     |
| Undergronds            | `tdf-undergronds`        | Unresolved individual terms     |
| WHIT-BLOD              | `tdf-whit-blod`          | Unresolved individual terms     |
| WPaint                 | `tdf-wpaint`             | Unresolved individual terms     |
