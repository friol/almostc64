
/* 

	Almost C64 emulator - (c) friol 2o21-2o25

	IN PROGRESS:
	- CPU undoc opcodes tests
	- verify cycles

	TODO:
	- spr/background collision
	- undocumented opcodes
	- ADSR envelopes
	- sid filters

	DONE:
	- 1541 emulation, g64/partial d64 loading
	- all documented opcodes tested against Lorenz test suite
	- fix delta instruction c3
	- sprite priority d01b
	- performance: screen buffer as an array of bytes, then blit to RGBA
	- x scrolling, 38/40 cols
	- y scrolling, 24 rows (some games like boulder dash and up'n'down don't scroll properly)
	- spr/spr collisions
	- SID digis

*/

var globalListOfOpcodes;
var globalEmuStatus=0; // 0 debugging single step, 1 running
var globalOldCyc=0;
var glbTargetTimeout=13;
var glbAdjustFpsCounter=0;
var glbMaxSpeed=false;

var glbCPU;
var glbMMU;
var glbDiskCPU;
var glbDiskMMU;
var glbFdcController;
var glbViaChip1,glbViaChip2;

var filterStrength = 20;
var frameTime = 0, lastLoop = new Date, thisLoop;
var fpsArray=new Array();

var glbPlayColor="black";

//
//
//

function runTHTests()
{
    const documentedOpcodes=[
		0x10,0x11,0x13,0x14,0x15,0x16,0x17,0x18,0x19,0x1A,0x1B,0x1C,0x1D,0x1E,0x1F,0x20,0x21,0x24,0x25,0x26,0x28,0x29,0x2A,0x2C,0x2D,
		0x2E,0x30,0x31,0x35,0x36,0x38,0x39,0x3C,0x3D,0x3E,0x40,0x41,0x44,0x45,0x46,0x47,0x48,0x49,0x4A,0x4B,0x4C,0x4D,0x4E,0x50,0x51,
		0x55,0x56,0x58,0x59,0x5A,0x5D,0x5E,0x5F,0x60,0x61,0x65,0x66,0x68,0x69,0x6A,0x6C,0x6D,0x6E,0x70,0x71,0x75,0x76,0x78,0x79,0x7D,
		0x7E,0x80,0x81,0x82,0x84,0x85,0x86,0x87,0x88,0x8A,0x8C,0x8E,0x8D,0x8F,0x90,0x91,0x94,0x95,0x96,0x98,0x99,0x9A,0x9D,0xA0,0xA1,
		0xA2,0xA4,0xA5,0xA6,0xA7,0xA8,0xA9,0xAA,0xAB,0xAC,0xAD,0xAE,0xAF,0xB0,0xB1,0xB3,0xB4,0xB5,0xB6,0xB7,0xB8,0xB9,0xBA,0xBC,0xBD,
		0xBE,0xC0,0xC1,0xC3,0xC4,0xC5,0xC6,0xC7,0xC8,0xC9,0xCA,0xCB,0xCC,0xCD,0xCE,0xD0,0xD1,0xD4,0xD5,0xD6,0xD8,0xD9,0xDD,0xDE,0xE0,
		0xE1,0xE4,0xE5,0xE6,0xE8,0xE9,0xEA,0xEB,0xEC,0xED,0xEE,0xEF,0xF0,0xF1,0xF5,0xF6,0xF8,0xF9,0xFA,0xFC,0xFD,0xFE,0xFF
	];

	const undocumentedOpcodes=[
	];

    for (var testNum=0;testNum<documentedOpcodes.length;testNum++)
    {
        const testJson="tomhartetests/"+documentedOpcodes[testNum].toString(16).padStart(2,'0')+".json";
        var testRunner=new cpuTestRunner(testJson);
    }

    for (var testNum=0;testNum<undocumentedOpcodes.length;testNum++)
	{
		const testJson="tomhartetests/"+undocumentedOpcodes[testNum].toString(16).padStart(2,'0')+".json";
		var testRunner=new cpuTestRunner(testJson);
	}
	
}

function waitForLoad()
{
	if (glbMMU.romsLoaded&&glbDiskMMU.romsLoaded)
	{
		glbCPU.powerUp();
		glbDiskCPU.powerUp();
	}
	else
	{
		window.setTimeout(function() 
		{
			waitForLoad();
		},
		200);
	}
}

function drawFFWDIcon()
{
    var cnvs = document.getElementById("mainCanvass");
    var ctx = cnvs.getContext("2d", { willReadFrequently: true });

    ctx.font='10px arial';
    ctx.fillStyle = 'white';
    ctx.textBaseline = 'top';

    ctx.fillText(">>",10,260);        
}

function startupFunction()
{
	globalEmuStatus=2;

	var ciaChip1=new cia(1);
	var ciaChip2=new cia(2);
	var vicChip=new vic();
	var sidChip=new sid();
	glbMMU=new c64mmu(vicChip,ciaChip1,ciaChip2,sidChip);
	glbCPU=new cpu6510(glbMMU);
	ciaChip1.linkCpu(glbCPU);
	ciaChip2.linkCpu(glbCPU);
	vicChip.setCPU(glbCPU);
	vicChip.setMMU(glbMMU);

	glbFdcController=new fdc1541();
	glbViaChip1=new via(1,glbFdcController);
	glbViaChip2=new via(2,glbFdcController);
	glbDiskMMU=new disk1541mmu(glbViaChip1,glbViaChip2,ciaChip1,ciaChip2,glbFdcController);
	glbDiskCPU=new cpu6510(glbDiskMMU);

	glbViaChip1.linkCpu(glbDiskCPU);
	glbViaChip2.linkCpu(glbDiskCPU);

	ciaChip1.link1541MMU(glbDiskMMU);
	ciaChip2.link1541MMU(glbDiskMMU);

	ciaChip2.linkVia(glbViaChip1);
	glbViaChip1.linkCia(ciaChip2);

	var rad = document.joyform.joySelection;
	var prev = null;
	for (var i = 0; i < rad.length; i++) {
		rad[i].addEventListener('change', function() 
		{
			if (this.value=="joy1") ciaChip1.curJoystick=1;
			else ciaChip1.curJoystick=2;
		});
	}

	document.getElementById("mainCanvass").addEventListener('click', event => 
	{
		if (globalEmuStatus!=2) return;
		if (glbPlayColor=="black") return;

		if (!sidChip.audioInitialized) sidChip.startMix(glbCPU);
		globalEmuStatus=1;

		document.getElementById("prgSelector").disabled=false;
		document.getElementById("cracktrosSelector").disabled=false;
	});	

	document.getElementById("mainCanvass").addEventListener("mousemove",function(e)
	{
		var relativeX = e.clientX - document.getElementById("mainCanvass").offsetLeft;
		var relativeY = e.clientY - document.getElementById("mainCanvass").offsetTop;

        var canvas = document.getElementById("mainCanvass");

		var centerx=canvas.width/2;
		var centery=canvas.height/2;

		var html=document.getElementById("html");
		var browserZoomLevel = 1.85;
		centerx*=browserZoomLevel;
		centery*=browserZoomLevel;

		var dist=Math.sqrt(((relativeX-centerx)*(relativeX-centerx))+((relativeY-centery)*(relativeY-centery)));
		if (dist<60.0) glbPlayColor="#2020e0";
		else glbPlayColor="black";

		glbCPU.setMousePos(relativeX,relativeY);
	}, 
	false);

	document.onkeydown = function(e)
	{
		if (e.key=="F10")
		{
			// single debugger step
			var elcyc=glbCPU.executeOneOpcode();			
			ciaChip1.update(elcyc,glbCPU);
			ciaChip2.update(elcyc,glbCPU);
			vicChip.updateVic(elcyc,glbCPU);
			sidChip.step(glbCPU.totCycles);

			var elcycDisk=glbDiskCPU.executeOneOpcode();
			glbViaChip1.countTimer(elcycDisk);
			glbViaChip2.countTimer(elcycDisk);
			glbDiskMMU.updateCycles(glbDiskCPU.totCycles);
		}
		else if (e.key=="PageUp")
		{
			// step n debugger steps
			while (glbCPU.pc!=0x8e2)
			{
				var elcyc=glbCPU.executeOneOpcode();			
				ciaChip1.update(elcyc,glbCPU);
				ciaChip2.update(elcyc,glbCPU);
				vicChip.updateVic(elcyc,glbCPU);
				sidChip.step(glbCPU.totCycles);
			}
		}
		else if (e.key=="PageDown")
		{
			// run to cursor
			var targetPC=glbCPU.runToCursor(30,globalListOfOpcodes);
			if (targetPC!=-1)
			{
				var times=0;
				var updateTimer=0;
				while ((glbCPU.pc!=targetPC))
				{
					var elcyc=glbCPU.executeOneOpcode();			
					ciaChip1.update(elcyc,glbCPU);
					ciaChip2.update(elcyc,glbCPU);
					vicChip.updateVic(elcyc,glbCPU);
					sidChip.step(glbCPU.totCycles);
							
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
		else if (e.key=="\\")
		{
			glbTargetTimeout=0;
			glbMaxSpeed=true;
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
		if (e.key=="F3") e.preventDefault();
		if (e.key=="F7") e.preventDefault();
		if (e.key=="F8") e.preventDefault();
		if (e.key=="F9") e.preventDefault();
		if (e.key=="F10") e.preventDefault();
		if (e.key=="PageDown") e.preventDefault();
	};

	document.onkeyup = function(e)
	{
		if (e.key=="\\")
		{
			glbTargetTimeout=13;
			glbMaxSpeed=false;
		}
	
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
	
	window.setTimeout(function() 
	{
		waitForLoad();
	},
	200);

	function showStartupScreen(cnvs)
	{
        var canvas = document.getElementById(cnvs);
        var ctx = canvas.getContext("2d");
		ctx.textRendering = "optimizeLegibility";
		
		ctx.fillStyle = "#d0d0d0";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		ctx.fillStyle = glbPlayColor;
		var sWidth = canvas.width;
		var sHeight = canvas.height;
		var path=new Path2D();
		path.moveTo((sWidth/2)-9,(sHeight/2)-15);
		path.lineTo((sWidth/2)+25-9,(sHeight/2));
		path.lineTo((sWidth/2)-9,(sHeight/2)+15);
		ctx.fill(path);

		ctx.arc(canvas.width / 2, canvas.height / 2, 24, 0, 2 * Math.PI, false);
		ctx.stroke();		
		ctx.lineWidth = 3;
		ctx.strokeStyle = glbPlayColor;
		ctx.stroke();		

		ctx.fillStyle = "black";
		ctx.font = "10px Arial";
		ctx.fillText("Welcome to the almostC64 emulator. To start, click on the \"play\" button.", 10, 20);
		ctx.fillText("You can load prg/g64/d64 files or start a game/cracktro from the selector below.", 10, 32);
		ctx.fillText("You can choose which joystick to use (joystick is controlled with cursor keys and CTRL).", 10, 44);
		ctx.fillText("Moreover, the tilde or whatever key it is (the upper left key) unthrottles the emulation.", 10, 56);
	}

	function updateScreen()
	{
		if (glbMMU.romsLoaded && glbCPU.CPUstarted)
		{
			if (globalEmuStatus==0)
			{
				globalListOfOpcodes=new Array();

				glbDiskCPU.debugOpcodes(24,globalListOfOpcodes);
				glbDiskCPU.drawDebugInfo(globalListOfOpcodes,10,30,0);
				//glbCPU.debugOpcodes(24,globalListOfOpcodes);
				//glbCPU.drawDebugInfo(globalListOfOpcodes,10,30,0);

				//vicChip.simpleRenderer("mainCanvass",520,170,glbMMU,ciaChip2);

				for (var i=0;i<=294;i++)
				{
					vicChip.scanlineRenderer("mainCanvass",380,180,glbMMU,ciaChip2,i);
				}
				vicChip.blit("mainCanvass",380,180);
			}
			else if (globalEmuStatus==1)
			{
				while ((glbCPU.totCycles-globalOldCyc)<(19656))
				{
					var elcyc=glbCPU.executeOneOpcode();			
					ciaChip1.update(elcyc,glbCPU);
					ciaChip2.update(elcyc,glbCPU);
					sidChip.step(glbCPU.totCycles);
					var elcycDisk=glbDiskCPU.executeOneOpcode();
					glbViaChip1.countTimer(elcycDisk);
					glbViaChip2.countTimer(elcycDisk);
					glbDiskMMU.updateCycles(glbDiskCPU.totCycles);

					var chRasterLine=vicChip.updateVic(elcyc,glbCPU);
					if (chRasterLine)
					{
						// draw previous line
						vicChip.scanlineRenderer("mainCanvass",0,0,glbMMU,ciaChip2);
						if (vicChip.currentRasterLine==0)
						{
							vicChip.blit("mainCanvass",0,0);
						}
					}

					/*if ((cpu.startLogging==false)&&(cpu.pc==0x8e2))
					{
						//cpu.startLogging=true;
						//cpu.traceLog();
						globalEmuStatus=0;
						break;
					}*/
				}	

				globalOldCyc=glbCPU.totCycles;
			}
			else if (globalEmuStatus==2)
			{
				// startup screen
				showStartupScreen("mainCanvass");
			}
		}

		if (glbMaxSpeed && (globalEmuStatus==1))
		{
			drawFFWDIcon();
		}

		// calc fps
		var thisFrameTime = (thisLoop=new Date) - lastLoop;
		frameTime+= (thisFrameTime - frameTime) / filterStrength;
		lastLoop = thisLoop;

		var fpsOut = document.getElementById('fpsSpan');
		var fpeez=parseInt((1000/frameTime).toFixed(1));
		fpsOut.innerHTML = fpeez + " fps";

		const targetFps=50; // PAL C64
		if (!glbMaxSpeed)
		{
			if (fpeez<targetFps)
			{
				// accelerate!
				if (glbTargetTimeout>1) glbTargetTimeout--;
			}
			else if (fpeez>targetFps)
			{
				// brake!!!
				glbTargetTimeout++;
			}
		}
		
		window.setTimeout(updateScreen,glbTargetTimeout);
	}

	updateScreen();
}

function handleFileUpload(fls)
{
	var arrayBuffer;
	var fileReader = new FileReader();
	fileReader.onload = function(event) 
	{
		var fname=document.getElementById("prgSelector").value;
		let lowerFname=fname.toLowerCase();

		if ((lowerFname.indexOf(".prg")<0)&&(lowerFname.indexOf(".g64")<0)&&(lowerFname.indexOf(".d64")<0)&&(lowerFname.indexOf(".")>0))
		{
			alert("You can only load .prg, .g64 or .d64 files");
			return;
		}

		arrayBuffer = event.target.result;
		var uint8ArrayNew  = new Uint8Array(arrayBuffer);

		if (lowerFname.indexOf(".g64")>0)
		{
			glbFdcController.loadG64image(uint8ArrayNew,glbDiskCPU.totCycles);			
		}
		else if (lowerFname.indexOf(".d64")>0)
		{
			glbFdcController.loadD64image(uint8ArrayNew,glbDiskCPU.totCycles);			
		}
		else if (lowerFname.indexOf(".prg")>0)
		{
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
				glbMMU.writeAddr(0x002F,(varstart & 0xff));
				glbMMU.writeAddr(0x0030,((varstart >> 8) & 0xff));
				glbMMU.writeAddr(0x0031,(varstart & 0xff));
				glbMMU.writeAddr(0x0032,((varstart >> 8) & 0xff));
			}		
			else
			{
				//alert("Doesn't seem to be a BASIC program");
			}

			// run program

			window.setTimeout(function() {document.dispatchEvent(new KeyboardEvent('keydown',{'key':'r'}));},100);
			window.setTimeout(function() {document.dispatchEvent(new KeyboardEvent('keyup',{'key':'r'}));},150);
			window.setTimeout(function() {document.dispatchEvent(new KeyboardEvent('keydown',{'key':'u'}));},200);
			window.setTimeout(function() {document.dispatchEvent(new KeyboardEvent('keyup',{'key':'u'}));},250);
			window.setTimeout(function() {document.dispatchEvent(new KeyboardEvent('keydown',{'key':'n'}));},300);
			window.setTimeout(function() {document.dispatchEvent(new KeyboardEvent('keyup',{'key':'n'}));},350);
			window.setTimeout(function() {document.dispatchEvent(new KeyboardEvent('keydown',{'key':'Enter'}));},400);
			window.setTimeout(function() {document.dispatchEvent(new KeyboardEvent('keyup',{'key':'Enter'}));},450);
		}
	
	};
	fileReader.readAsArrayBuffer(fls[0]);	
}

function loadCracktro(th)
{
	var thisInstance=this;

	if (th.value=="run") return;

	$.ajax({
		url: "cracktros/"+th.value,type: "GET",processData: false,dataType: "binary",
		success: function(data) 
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
					glbMMU.writeAddr(0x002F,(varstart & 0xff));
					glbMMU.writeAddr(0x0030,((varstart >> 8) & 0xff));
					glbMMU.writeAddr(0x0031,(varstart & 0xff));
					glbMMU.writeAddr(0x0032,((varstart >> 8) & 0xff));
				}		
				else
				{
					//alert("Doesn't seem to be a BASIC program");
				}
		
				// run program
		
				window.setTimeout(function() {document.dispatchEvent(new KeyboardEvent('keydown',{'key':'r'}));},100);
				window.setTimeout(function() {document.dispatchEvent(new KeyboardEvent('keyup',{'key':'r'}));},150);
				window.setTimeout(function() {document.dispatchEvent(new KeyboardEvent('keydown',{'key':'u'}));},200);
				window.setTimeout(function() {document.dispatchEvent(new KeyboardEvent('keyup',{'key':'u'}));},250);
				window.setTimeout(function() {document.dispatchEvent(new KeyboardEvent('keydown',{'key':'n'}));},300);
				window.setTimeout(function() {document.dispatchEvent(new KeyboardEvent('keyup',{'key':'n'}));},350);
				window.setTimeout(function() {document.dispatchEvent(new KeyboardEvent('keydown',{'key':'Enter'}));},400);
				window.setTimeout(function() {document.dispatchEvent(new KeyboardEvent('keyup',{'key':'Enter'}));},450);
		
			}
			fileReader.readAsArrayBuffer(data);                    

        
		},
		error: function(xhr, status, error) { alert("Error loading cracktro ["+error+"]"); }
	});
}

window.onload=function()
{
	startupFunction();
}
