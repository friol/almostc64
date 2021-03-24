/* Almost C64 emulator - main.js */

var globalListOfOpcodes;
var globalEmuStatus=0; // 0 debugging single step, 1 running
var globalOldCyc=0;

var glbMMU;

var filterStrength = 20;
var frameTime = 0, lastLoop = new Date, thisLoop;
var fpsArray=new Array();

//
//
//

function startupFunction()
{
	var ciaChip1=new cia(1);
	var ciaChip2=new cia(2);
	var vicChip=new vic();
	var sidChip=new sid();
	glbMMU=new c64mmu(vicChip,ciaChip1,ciaChip2,sidChip);
	var cpu=new cpu6510(glbMMU);
	ciaChip1.linkCpu(cpu);
	ciaChip2.linkCpu(cpu);

	var rad = document.joyform.joySelection;
	var prev = null;
	for (var i = 0; i < rad.length; i++) {
		rad[i].addEventListener('change', function() 
		{
			if (this.value=="joy1") ciaChip1.curJoystick=1;
			else ciaChip1.curJoystick=2;
		});
	}

	globalEmuStatus=1;

	document.getElementById("mainCanvass").addEventListener("mousemove",function(e)
	{
		var relativeX = e.clientX - document.getElementById("mainCanvass").offsetLeft;
		var relativeY = e.clientY - document.getElementById("mainCanvass").offsetTop;

		cpu.setMousePos(relativeX,relativeY);
	}, 
	false);

	document.onkeydown = function(e)
	{
		if (e.key=="F10")
		{
			// single debugger step
			var elcyc=cpu.executeOneOpcode();			
			ciaChip1.update(elcyc,cpu);
			ciaChip2.update(elcyc,cpu);
			vicChip.updateVic(elcyc,cpu);
			//apu.step(cpu.totCycles);
		}
		/*else if (e.key=="d")
		{
			// step n debugger steps
			for (var i=0;i<300;i++)
			{
				var elcyc=cpu.executeOneOpcode();			
				ciaChip1.update(elcyc,cpu);
				ciaChip2.update(elcyc,cpu);
			}
		}*/
		else if (e.key=="PageDown")
		{
			// run to cursor
			var targetPC=cpu.runToCursor(30,globalListOfOpcodes);
			if (targetPC!=-1)
			{
				var times=0;
				var updateTimer=0;
				while ((cpu.pc!=targetPC))
				{
					var elcyc=cpu.executeOneOpcode();			
					ciaChip1.update(elcyc,cpu);
					ciaChip2.update(elcyc,cpu);
					vicChip.updateVic(elcyc,cpu);
							
					times+=1;
					updateTimer+=1;

					if (times==3)
					{
						times=0;
						//ppu.step(cpu.totCycles,cpu);
						//apu.step(cpu.totCycles);
						//if ((updateTimer%10000)==0) ppu.simpleRenderer("mainCanvass",610,270)
					}
				}				
			}
		}
		else if (e.key=="F8")
		{
			// run
			globalEmuStatus=1;
			document.getElementById("mainCanvass").width=402;
			document.getElementById("mainCanvass").height=292;
		}
		else if (e.key=="F9")
		{
			// stop
			globalEmuStatus=0;
			document.getElementById("mainCanvass").width=900;
			document.getElementById("mainCanvass").height=600;
		}
		else
		{
			for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") 
			{
				if ((ciaChip1.keyboardKeyList.indexOf("Shift")>=0) && (e.key==c)) ciaChip1.keyPress(c.toLowerCase());
			}

			if ((ciaChip1.keyboardKeyList.indexOf("Shift")>=0) && (e.key=="\"")) ciaChip1.keyPress("2");
			else if ((ciaChip1.keyboardKeyList.indexOf("Shift")>=0) && (e.key=="£")) ciaChip1.keyPress("3");
			else if ((ciaChip1.keyboardKeyList.indexOf("Shift")>=0) && (e.key=="$")) ciaChip1.keyPress("4");
			else if ((ciaChip1.keyboardKeyList.indexOf("Shift")>=0) && (e.key=="%")) ciaChip1.keyPress("5");
			else if ((ciaChip1.keyboardKeyList.indexOf("Shift")>=0) && (e.key=="&")) ciaChip1.keyPress("6");
			else if ((ciaChip1.keyboardKeyList.indexOf("Shift")>=0) && (e.key=="/")) ciaChip1.keyPress("7");
			else if ((ciaChip1.keyboardKeyList.indexOf("Shift")>=0) && (e.key=="(")) ciaChip1.keyPress("8");
			else if ((ciaChip1.keyboardKeyList.indexOf("Shift")>=0) && (e.key==")")) ciaChip1.keyPress("9");
			else if (e.key=="<") 
			{
				ciaChip1.keyPress("Shift");
				ciaChip1.keyPress(",");
			}
			else if ((ciaChip1.keyboardKeyList.indexOf("Shift")>=0) && (e.key==">")) 
			{
				ciaChip1.keyPress("Shift");
				ciaChip1.keyPress(".");
			}
			else ciaChip1.keyPress(e.key);
		}

		if (e.key=="Backspace") e.preventDefault();
		if (e.key=="F1") e.preventDefault();
		if (e.key=="F8") e.preventDefault();
		if (e.key=="F9") e.preventDefault();
		if (e.key=="F10") e.preventDefault();
		if (e.key=="PageDown") e.preventDefault();
	};

	document.onkeyup = function(e)
	{
		for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") 
		{
			if (e.key==c) ciaChip1.keyUp(c.toLowerCase());
		}

		if (e.key=="\"") ciaChip1.keyUp("2");
		else if (e.key=="£") ciaChip1.keyUp("3");
		else if (e.key=="$") ciaChip1.keyUp("4");
		else if (e.key=="%") ciaChip1.keyUp("5");
		else if (e.key=="&") ciaChip1.keyUp("6");
		else if (e.key=="/") ciaChip1.keyUp("7");
		else if (e.key=="(") ciaChip1.keyUp("8");
		else if (e.key==")") ciaChip1.keyUp("9");
		else if (e.key=="<") { ciaChip1.keyUp("Shift"); ciaChip1.keyUp(","); }
		else if (e.key==">") { ciaChip1.keyUp("."); }
		else ciaChip1.keyUp(e.key);
	}
	
	window.setTimeout(function() {cpu.powerUp();},200);

	function updateScreen()
	{
		if (glbMMU.romsLoaded && cpu.CPUstarted)
		{
			if (globalEmuStatus==0)
			{
				globalListOfOpcodes=new Array();
				cpu.debugOpcodes(24,globalListOfOpcodes);
				
				cpu.drawDebugInfo(globalListOfOpcodes,10,30,0);
				vicChip.simpleRenderer("mainCanvass",520,170,glbMMU,ciaChip2);
			}
			else if (globalEmuStatus==1)
			{
				while ((cpu.totCycles-globalOldCyc)<(16666))
				{
					var elcyc=cpu.executeOneOpcode();			
					ciaChip1.update(elcyc,cpu);
					ciaChip2.update(elcyc,cpu);
					vicChip.updateVic(elcyc,cpu);

					/*if (this.pc==2070)
					{
						globalEmuStatus=0;
						break;
					}*/
				}			

				//globalListOfOpcodes=new Array();
				//cpu.debugOpcodes(24,globalListOfOpcodes);
				//cpu.drawDebugInfo(globalListOfOpcodes,10,30,0);

				//vicChip.simpleRenderer("mainCanvass",520,170,mmu);
				vicChip.simpleRenderer("mainCanvass",0,0,glbMMU,ciaChip2);

				globalOldCyc=cpu.totCycles;
			}
		}

		// calc fps
		var thisFrameTime = (thisLoop=new Date) - lastLoop;
		frameTime+= (thisFrameTime - frameTime) / filterStrength;
		lastLoop = thisLoop;

		var fpsOut = document.getElementById('fpsSpan');
		var fpeez=(1000/frameTime).toFixed(1);
		fpsOut.innerHTML = fpeez + " fps";

		window.setTimeout(updateScreen, 13);
	}

	updateScreen();
}

function handleFileUpload(fls)
{
	var arrayBuffer;
	var fileReader = new FileReader();
	fileReader.onload = function(event) 
	{
		arrayBuffer = event.target.result;
		var uint8ArrayNew  = new Uint8Array(arrayBuffer);

		var loadAddr=((uint8ArrayNew[1]) << 8) | uint8ArrayNew[0];

		var offset=0;
		for (var i = 2; i < uint8ArrayNew.length; i++) 
		{
			glbMMU.writeAddr(loadAddr - 2 + i,uint8ArrayNew[i]);
			offset+=1;
		}

		// if loaded a BASIC program,update pointers
		if (loadAddr == 0x0801)
		{
			var varstart = loadAddr + offset;
			glbMMU.writeAddr(0x002D,(varstart & 0xff));
			glbMMU.writeAddr(0x002E,((varstart >> 8) & 0xff));
		}		
	};
	fileReader.readAsArrayBuffer(fls[0]);	
}

window.onload=function()
{
	startupFunction();
}
