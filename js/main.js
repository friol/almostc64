
/* 

Almost C64 emulator - main.js 

IN PROGRESS:
- 1541 emulation

TODO:
- spr/background collision
- undocumented opcodes
- ADSR envelopes
- sid filters

DONE:
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
var glbTargetTimeout=10;
var glbAdjustFpsCounter=0;

var glbCPU;
var glbMMU;
var glbDiskCPU;
var glbDiskMMU;
var glbFdcController;

var filterStrength = 20;
var frameTime = 0, lastLoop = new Date, thisLoop;
var fpsArray=new Array();

var glbPlayColor="black";

var glbProgList=[
//"alrb",                                                                 
//"ancb",                                                                 
//"aneb",                                                                 
//"arrb",                                                                 
//"asoa",                                                                 
//"asoax",                                                                
//"asoay",                                                                
//"asoix",                                                                
//"asoiy",                                                                
//"asoz",                                                                 
//"asozx",                                                                
//"axsa",                                                                 
//"axsix",                                                                
//"axsz",                                                                 
//"axszy",                                                                
//"bccr",                                                                 
//"bcsr",                                                                 
//"branchwrap",                                                           
//"cia1pb6",                                                              
//"cia1pb7",                                                              
//"cia1ta",                                                               
//"cia1tab",                                                              
//"cia1tb",                                                               
//"cia1tb123",                                                            
//"cia2pb6",                                                              
//"cia2pb7",                                                              
//"cia2ta",                                                               
//"cia2tb",                                                               
//"cia2tb123",                                                            
//"cntdef",                                                               
//"cnto2",                                                                
//"cpuport",                                                              
//"cputiming",                                                            
//"dcma",                                                                 
//"dcmax",                                                                
//"dcmay",                                                                
//"dcmix",                                                                
//"dcmiy",                                                                
//"dcmz",                                                                 
//"dcmzx",                                                                
//"flipos",                                                               
//"icr01",                                                                
//"imr",                                                                  
//"insa",                                                                 
//"insax",                                                                
//"insay",                                                                
//"insix",                                                                
//"insiy",                                                                
//"insz",                                                                 
//"inszx",                                                                
//"irq",                                                                  
//"lasay",                                                                
//"laxa",                                                                 
//"laxay",                                                                
//"laxix",                                                                
//"laxiy",                                                                
//"laxz",                                                                 
//"laxzy",                                                                
//"loadth",                                                               
//"lsea",                                                                 
//"lseax",                                                                
//"lseay",                                                                
//"lseix",                                                                
//"lseiy",                                                                
//"lsez",                                                                 
//"lsezx",                                                                
//"lxab",                                                                 
//"nmi",                                                                  
//"nopax",                                                                
//"nopb",                                                                 
//"nopn",                                                                 
//"nopz",                                                                 
//"nopzx",                                                                
//"oneshot",                                                              
//"rlaa",                                                                 
//"rlaax",                                                                
//"rlaay",                                                                
//"rlaix",                                                                
//"rlaiy",                                                                
//"rlaz",                                                                 
//"rlazx",                                                                
//"rraa",                                                                 
//"rraax",                                                                
//"rraay",                                                                
//"rraix",                                                                
//"rraiy",                                                                
//"rraz",                                                                 
//"rrazx",                                                                
//"shaay",                                                                
//"shaiy",                                                                
//"shsay",                                                                
//"shxay",                                                                
//"shyax",                                                                
//"trap1",                                                                
//"trap10",                                                               
//"trap11",                                                               
//"trap12",                                                               
//"trap13",                                                               
//"trap14",                                                               
//"trap15",                                                               
//"trap16",                                                               
//"trap17",                                                               
//"trap2",                                                                
//"trap3",                                                                
//"trap4",                                                                
//"trap5",                                                                
//"trap6",                                                                
//"trap7",                                                                
//"trap8",                                                                
//"trap9",                                                                
//"tsxn",                                                                 
//"txan",                                                                 
//"txsn",                                                                 
//"tyan"                                                                 
	];
var glbProgNum=0;


//
//
//

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
	var viaChip1=new via(1,glbFdcController);
	var viaChip2=new via(2,glbFdcController);
	glbDiskMMU=new disk1541mmu(viaChip1,viaChip2);
	glbDiskCPU=new cpu6510(glbDiskMMU);

	ciaChip2.linkVia(viaChip1);
	viaChip1.linkCia(ciaChip2);

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
		else if (e.key=="+")
		{
			vicChip.debugShifter+=0x10;
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
		ctx.fillText("You can load a .prg file and run it or start a game/cracktro from the selector below.", 10, 32);
		ctx.fillText("You can choose which joystick to use (joystick is controlled with cursor keys and CTRL).", 10, 44);
	}

	function updateScreen()
	{
		if (glbMMU.romsLoaded && glbCPU.CPUstarted)
		{
			if (globalEmuStatus==0)
			{
				globalListOfOpcodes=new Array();
				glbCPU.debugOpcodes(24,globalListOfOpcodes);
				
				glbCPU.drawDebugInfo(globalListOfOpcodes,10,30,0);
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
					glbDiskCPU.executeOneOpcode();
					glbFdcController.step();
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

		// calc fps
		var thisFrameTime = (thisLoop=new Date) - lastLoop;
		frameTime+= (thisFrameTime - frameTime) / filterStrength;
		lastLoop = thisLoop;

		var fpsOut = document.getElementById('fpsSpan');
		var fpeez=parseInt((1000/frameTime).toFixed(1));
		fpsOut.innerHTML = fpeez + " fps";

		/*if (glbAdjustFpsCounter==100)
		{
			glbAdjustFpsCounter=0;
			if (fpeez<55)
			{
				if (glbTargetTimeout>0) glbTargetTimeout--;
			}
			else if (fpeez>55)
			{
				glbTargetTimeout++;
			}
		}
		else
		{
			glbAdjustFpsCounter++;
		}*/

		window.setTimeout(updateScreen,12);
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

		if ((fname.indexOf(".prg")<0)&&(fname.indexOf(".PRG")<0)&&(fname.indexOf(".")>0))
		{
			alert("You can only load .prg files");
			return;
		}

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

function loadNextProggie()
{
	var thisInstance=this;

	var proggo=glbProgList[glbProgNum];
	glbProgNum++;

	$.ajax({
		url: "testsuite/"+proggo,type: "GET",processData: false,dataType: "binary",
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
		error: function(xhr, status, error) { alert("Error loading proggie ["+error+"]"); }
	});
}

window.onload=function()
{
	startupFunction();
}
