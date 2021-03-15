/* main.js */

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
		if (e.key=="ArrowRight")
		{
			// single debugger step
			var elcyc=cpu.executeOneOpcode();			
			ciaChip1.update(elcyc,cpu);
			ciaChip2.update(elcyc,cpu);
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
		else if (e.key=="ArrowDown")
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
		else if (e.key=="ArrowUp")
		{
			// run
			globalEmuStatus=1;
			document.getElementById("mainCanvass").width=402;
			document.getElementById("mainCanvass").height=292;
		}
		else if (e.key=="ArrowLeft")
		{
			// stop
			globalEmuStatus=0;
			document.getElementById("mainCanvass").width=900;
			document.getElementById("mainCanvass").height=600;
		}
		else
		{
			ciaChip1.keyPress(e.key);
		}
	};

	document.onkeyup = function(e)
	{
		//if ((e.key=="ArrowDown")||(e.key=="ArrowUp")||(e.key=="ArrowLeft")||(e.key=="ArrowRight")||(e.key=="p")||(e.key=="o")||(e.key=="k")||(e.key=="l"))
		{
			ciaChip1.keyUp(e.key);
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
				vicChip.simpleRenderer("mainCanvass",520,170,mmu)
			}
			else if (globalEmuStatus==1)
			{
				while ((cpu.totCycles-globalOldCyc)<(16666))
				{
					var elcyc=cpu.executeOneOpcode();			
					ciaChip1.update(elcyc,cpu);
					ciaChip2.update(elcyc,cpu);
				}			

				//globalListOfOpcodes=new Array();
				//cpu.debugOpcodes(24,globalListOfOpcodes);
				//cpu.drawDebugInfo(globalListOfOpcodes,10,30,0);

				//vicChip.simpleRenderer("mainCanvass",520,170,mmu);
				vicChip.simpleRenderer("mainCanvass",0,0,mmu);

				globalOldCyc=cpu.totCycles;
				globalFrameNum+=1;
			}
		}

		// calc fps
		var thisFrameTime = (thisLoop=new Date) - lastLoop;
		frameTime+= (thisFrameTime - frameTime) / filterStrength;
		lastLoop = thisLoop;

		var fpsOut = document.getElementById('fpsSpan');
		var fpeez=(1000/frameTime).toFixed(1);
		fpsOut.innerHTML = fpeez + " fps";

		window.setTimeout(updateScreen, 1000 / globalSchedulePeriod);
	}

	updateScreen();
}

window.onload=function()
{
	startupFunction();
}
