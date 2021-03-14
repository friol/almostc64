/* main.js */

var globalRomLoader;
var globalListOfOpcodes;
var globalEmuStatus=0; // 0 debugging single step, 1 running
var globalFrameNum=0;
var globalOldCyc=0;
var globalSchedulePeriod=80;

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
	var mmu=new c64mmu(vicChip,ciaChip1,ciaChip2);
	var cpu=new cpu6510(mmu);

	document.getElementById("mainCanvass").addEventListener("mousemove",function(e)
	{
		var relativeX = e.clientX - document.getElementById("mainCanvass").offsetLeft;
		var relativeY = e.clientY - document.getElementById("mainCanvass").offsetTop;

		cpu.setMousePos(relativeX,relativeY);
	}, 
	false);

	document.onkeydown = function(e)
	{
		if (e.key=="s")
		{
			// single debugger step
			cpu.executeOneOpcode();			
			//ppu.step(cpu.totCycles,cpu,610,270,false);
			//apu.step(cpu.totCycles);
		}
		else if (e.key=="d")
		{
			// step n debugger steps
			for (var i=0;i<300;i++)
			{
				cpu.executeOneOpcode();			
			}

			//ppu.step(cpu.totCycles,cpu,610,270,false);
			//apu.step(cpu.totCycles);
		}
		else if (e.key=="a")
		{
			// run to cursor
			var targetPC=cpu.runToCursor(30,globalListOfOpcodes);
			if (targetPC!=-1)
			{
				var times=0;
				var updateTimer=0;
				while ((cpu.pc!=targetPC))
				{
					cpu.executeOneOpcode();
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
		else if (e.key=="f")
		{
			// run
			globalEmuStatus=1;
			document.getElementById("mainCanvass").width=256*2;
			document.getElementById("mainCanvass").height=240*2;
		}
		else if (e.key=="g")
		{
			// stop
			globalEmuStatus=0;
			document.getElementById("mainCanvass").width=900;
			document.getElementById("mainCanvass").height=600;

			var media=0.0;
			for (var f=0;f<fpsArray.length;f++)
			{
				media+=parseFloat(fpsArray[f]);
			}
			media/=f;
			//alert(media);
		}
		else if ((e.key=="ArrowDown")||(e.key=="ArrowUp")||(e.key=="ArrowLeft")||(e.key=="ArrowRight")||(e.key=="p")||(e.key=="o")||(e.key=="k")||(e.key=="l"))
		{
			//mmu.keyDown(e.key);
		}
	};

	document.onkeyup = function(e)
	{
		if ((e.key=="ArrowDown")||(e.key=="ArrowUp")||(e.key=="ArrowLeft")||(e.key=="ArrowRight")||(e.key=="p")||(e.key=="o")||(e.key=="k")||(e.key=="l"))
		{
			//mmu.keyUp(e.key);
		}
	}
	
	window.setTimeout(function() {cpu.powerUp();},200);

	function updateScreen()
	{
		if (mmu.romsLoaded && cpu.CPUstarted)
		{
			if (globalEmuStatus==0)
			{
				globalListOfOpcodes=new Array();
				cpu.debugOpcodes(24,globalListOfOpcodes);
				
				cpu.drawDebugInfo(globalListOfOpcodes,10,30,0);
				//ppu.drawDebugInfo("mainCanvass",610,170)

				//ppu.simpleRenderer("mainCanvass",610,270,false)
			}
			else if (globalEmuStatus==1)
			{
				while ((cpu.totCycles-globalOldCyc)<(29780))
				{
					cpu.executeOneOpcode();
					//ppu.step(cpu.totCycles,cpu,10,10,true);
					//apu.step(cpu.totCycles);
				}			

				globalOldCyc=cpu.totCycles;

				//ppu.drawDebugInfo("mainCanvass",610,170)

				globalFrameNum+=1;
			}
		}

		// calc fps
		var thisFrameTime = (thisLoop=new Date) - lastLoop;
		frameTime+= (thisFrameTime - frameTime) / filterStrength;
		lastLoop = thisLoop;

		window.setTimeout(updateScreen, 1000 / globalSchedulePeriod);
	}

	updateScreen();
}

window.onload=function()
{
	startupFunction();
}
