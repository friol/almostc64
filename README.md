# Almost C64 - A C64 emulator written in javascript

A C64 emulator, what else, because C64 was and still is the best home computer. Yeah, better than our PCs.

I developed a C# C64 emulator some years ago (in 2015, I think), but C# is so 2010. So I took my beloved javascript and, re-using the 6502 core from [almostNES](https://github.com/friol/almostNES "almostNES"), a C64 emulator was ready in a few days. Then I spent some more days trying to improve the compatibility.<br/><br/>
This new emulator has SID sound (a thing that the C# prototype had not) and is already capable of generating SID-ish sounds. SID was so ahead for its time (remember that it has been made in 1982, so it's a chip that is almost 40 years old).

The javascript code should be self-explanatory. What really helped while writing the source code were a couple of books that describe the 6502 and the graphic/sound chips of the C64 ("Programming the 6502" by Rodnay Zaks and "Commodore 64, la grafica e il suono" by Rita Bonelli and others).

Some screenshots:

<img src="https://raw.githubusercontent.com/friol/almostc64/master/c64_cracked.png" width="320" height="240"> <img src="https://raw.githubusercontent.com/friol/almostc64/master/piersoft.png" width="320" height="240">
<img src="https://raw.githubusercontent.com/friol/almostc64/master/pyra_cracktro.png" width="320" height="240"> <img src="https://raw.githubusercontent.com/friol/almostc64/master/twins_cracktro.png" width="320" height="240">
<img src="https://raw.githubusercontent.com/friol/almostc64/master/impossible_mission.png" width="320" height="240"> <img src="https://raw.githubusercontent.com/friol/almostc64/master/rom.png" width="320" height="240">

The online, up-to-date version is here: http://dantonag.it/almostC64/index.html
