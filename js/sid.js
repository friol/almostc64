/* MOD6581 - sid */

class sidVoice
{
    constructor()
    {
        this.frequency=0;
        this.voiceWaveform=0;
        this.pulseWidth=0;
        this.wavePos=0.0;
        this.attack=0;
        this.decay=0;
        this.sustain=0;
        this.release=0;

        this.attackDurationSamples=0;
        this.decayDurationSamples=0;
        this.releaseDurationSamples=0;
        this.adsrPos=0;
        this.adsrPhase=0; // 0: sound stopped, 1: attack-decay-sustain, 2: release
    }
}

class sid
{
    constructor()
    {
        this.lastSidByte=0;

        this.globalVolume=0;
        this.voice3muted=false;
        this.randomSeed=1;

        this.sidNumVoices=3;
        this.voiceArray=new Array();
        for (var v=0;v<this.sidNumVoices;v++)
        {
            this.voiceArray.push(new sidVoice());
        }

        this.triangleWaveLen=256;
        this.triangleWave=new Array();
        for (var s=0;s<this.triangleWaveLen;s++)
        {
            if (s<Math.floor(this.triangleWaveLen/2)) 
            {
                this.triangleWave[s]=s/(this.triangleWaveLen/2);
            }
            else 
            {
                this.triangleWave[s]=(this.triangleWaveLen-s)/(this.triangleWaveLen/2);
            }
        }

        this.squareWaveLen=8192;
        this.sawtoothLen=8192;

        this.digiQueue=new Array();

        /*this.sampleTab=[
	        0x8000,0x9111,0xa222,0xb333,0xc444,0xd555,0xe666,0xf777,
            0x0888,0x1999,0x2aaa,0x3bbb,0x4ccc,0x5ddd,0x6eee,0x7fff
        ];*/

        //
        // audio engine
        //

        this.eventsQueue=new Array();
        this.internalClock=0;
        this.internalClockPos=0;

        this.audioInitialized=false;
    }

    getNextRandom()
    {
        return (Math.floor(Math.random()*255.0))&0xff;
    }

    startMix(thecpu)
    {
        try 
        {
            this.audioEnabled=true;
            //this.audioEnabled=false;
            //return;

            this.audioBufSize=1024;

            var self=this;
            this.webAudioAPIsupported=true;
    
            window.AudioContext = window.AudioContext||window.webkitAudioContext;
            this.context = new AudioContext();
    
            this.gainNode = this.context.createGain();
            this.gainNode.gain.value = 0.5;
    
            this.jsNode = this.context.createScriptProcessor(this.audioBufSize, 0, 2);
            this.jsNode.onaudioprocess = function(e)
            {
                self.mixFunction(e);
            }
    
            this.jsNode.connect(this.gainNode);
    
            this.gainNode.connect(this.context.destination);

            this.multiplier=Math.floor(thecpu.frequency/this.jsNode.context.sampleRate);
            this.sampleArray=new Array(this.multiplier);
            for (var i=0;i<this.multiplier;i++)
            {
                this.sampleArray[i]=0.0;
            }

            this.audioInitialized=true;
        }
        catch(e) 
        {
            alert('Error: Web Audio API is not supported in this browser. Buy a new one.');
            this.webAudioAPIsupported=false;
        }        
    }

    step(totCpuCycles)
    {
        this.internalClock=totCpuCycles;
    }

    mixFunction(e)
    {
        if (!this.audioEnabled) return;
        if (!this.audioInitialized) return;

        var dataL = e.outputBuffer.getChannelData(0);
        var dataR = e.outputBuffer.getChannelData(1);

        var numClocksToCover=this.internalClock-this.internalClockPos;
        if (numClocksToCover<=0) return;
        var realStep=numClocksToCover/(this.multiplier*this.audioBufSize);

        var ic=this.internalClockPos;
        var digiTrack=new Array();
        var globalVol=this.globalVolume;
        var iqpos=0;
        var workingQueue=new Array();
        for (var i=0;i<this.eventsQueue.length;i++)
        {
            if (this.eventsQueue[i][1]==0xd418)
            {
                workingQueue.push(this.eventsQueue[i]);
            }
        }

        if (workingQueue.length>0)
        {
            for (var s=0;s<this.audioBufSize;s++)
            {
                var runningSum=0;
                for (var cyc=0;cyc<this.multiplier;cyc++)
                {
                    if ((iqpos<workingQueue.length)&&(workingQueue[iqpos][2]==Math.floor(ic)))
                    {
                        var value=workingQueue[iqpos][0];
                        globalVol=value&0x0f;
                        iqpos++;
                    }

                    runningSum+=(globalVol/15.0);
                    ic+=realStep;
                }

                runningSum/=this.multiplier;
                digiTrack.push(runningSum);
            }
        }

        for (var s=0;s<this.audioBufSize;s++)
        {
            var runningTotal=0.0;

            for (var cyc=0;cyc<this.multiplier;cyc++)
            {
                // process queued events if current time >= event timestamp
                if ((this.eventsQueue.length>0)&&(this.eventsQueue[0][2]<=Math.floor(this.internalClockPos)))
                {
                    var curEvent=this.eventsQueue.shift();
                    var value=curEvent[0];

                    if (curEvent[1]==0xd400)
                    {
                        this.voiceArray[0].frequency=(this.voiceArray[0].frequency&0xff00)|value;
                    }
                    else if (curEvent[1]==0xd401)
                    {
                        this.voiceArray[0].frequency=(this.voiceArray[0].frequency&0xff)|(value<<8);
                    }
                    else if (curEvent[1]==0xd402)
                    {
                        this.voiceArray[0].pulseWidth=(this.voiceArray[0].pulseWidth&0xff00)|value;
                    }
                    else if (curEvent[1]==0xd403)
                    {
                        this.voiceArray[0].pulseWidth=(this.voiceArray[0].pulseWidth&0xff)|((value&0x0f)<<8);
                    }
                    else if (curEvent[1]==0xd405)
                    {
                        this.voiceArray[0].attack=value>>4;
                        this.voiceArray[0].decay=value&0x0f;
                    }
                    else if (curEvent[1]==0xd406)
                    {
                        this.voiceArray[0].sustain=value>>4;
                        this.voiceArray[0].release=value&0x0f;
                    }
                    else if (curEvent[1]==0xd407)
                    {
                        this.voiceArray[1].frequency=(this.voiceArray[1].frequency&0xff00)|value;
                    }
                    else if (curEvent[1]==0xd408)
                    {
                        this.voiceArray[1].frequency=(this.voiceArray[1].frequency&0xff)|(value<<8);
                    }
                    else if (curEvent[1]==0xd409)
                    {
                        this.voiceArray[1].pulseWidth=(this.voiceArray[1].pulseWidth&0xff00)|value;
                    }
                    else if (curEvent[1]==0xd40a)
                    {
                        this.voiceArray[1].pulseWidth=(this.voiceArray[1].pulseWidth&0xff)|((value&0x0f)<<8);
                    }
                    else if (curEvent[1]==0xd40e)
                    {
                        this.voiceArray[2].frequency=(this.voiceArray[2].frequency&0xff00)|value;
                    }
                    else if (curEvent[1]==0xd40f)
                    {
                        this.voiceArray[2].frequency=(this.voiceArray[2].frequency&0xff)|(value<<8);
                    }
                    else if (curEvent[1]==0xd410)
                    {
                        this.voiceArray[2].pulseWidth=(this.voiceArray[2].pulseWidth&0xff00)|value;
                    }
                    else if (curEvent[1]==0xd411)
                    {
                        this.voiceArray[2].pulseWidth=(this.voiceArray[2].pulseWidth&0xff)|((value&0x0f)<<8);
                    }
                    else if ((curEvent[1]==0xd404)||(curEvent[1]==0xd40b)||(curEvent[1]==0xd412))
                    {
                        if (curEvent[1]==0xd404) this.voiceArray[0].voiceWaveform=(value>>4)&0x0f;
                        if (curEvent[1]==0xd40b) this.voiceArray[1].voiceWaveform=(value>>4)&0x0f;
                        if (curEvent[1]==0xd412) this.voiceArray[2].voiceWaveform=(value>>4)&0x0f;
                    }
                    else if (curEvent[1]==0xd418)
                    {
                        this.globalVolume=value&0x0f;
                        this.voice3muted=((value&0x80)==0x80);
                    }

                }

                //
                // MIX
                //

                if (globalEmuStatus==1)
                {
                    runningTotal+=this.mixVoices()/3.0;                
                }

                this.internalClockPos+=realStep;
            }

            runningTotal/=this.multiplier;

            if (workingQueue.length>0) runningTotal+=digiTrack[s];
            else runningTotal+=(this.globalVolume/15.0);

            dataL[s]=runningTotal;
            dataR[s]=runningTotal;
        }

        if (this.eventsQueue.length>0) this.eventsQueue=[];
    }

    mixVoices()
    {
        var finalSample=0;

        for (var v=0;v<this.sidNumVoices;v++)
        {
            var curSamp=0;

            if ((v==2)&&(this.voice3muted))
            {
            }
            else if (this.voiceArray[v].frequency!=0)
            {
                if ((this.voiceArray[v].voiceWaveform&0x1)==0x1) // triangle
                {
                    var pos=Math.floor(this.voiceArray[v].wavePos%this.triangleWaveLen);
                    curSamp=this.triangleWave[pos];
                    var realFreq=this.voiceArray[v].frequency/(8192.0*this.multiplier*0.19*2.0); // black magic
                    this.voiceArray[v].wavePos+=realFreq;
                    this.voiceArray[v].wavePos%=this.triangleWaveLen;
                }
                else if ((this.voiceArray[v].voiceWaveform&0x2)==0x2) // sawtooth
                {
                    curSamp=this.voiceArray[v].wavePos/this.sawtoothLen;
                    var realFreq=this.voiceArray[v].frequency/(this.multiplier*128.0*0.77);
                    this.voiceArray[v].wavePos+=realFreq;
                    this.voiceArray[v].wavePos%=this.sawtoothLen;
                }
                else if ((this.voiceArray[v].voiceWaveform&0x4)==0x4) // pulse wave
                {
                    var pos=Math.floor(this.voiceArray[v].wavePos%this.squareWaveLen);
                    if (pos<this.voiceArray[v].pulseWidth) curSamp=1.0;
                    var realFreq=this.voiceArray[v].frequency/(this.multiplier*128.0*0.77);
                    this.voiceArray[v].wavePos+=realFreq;
                    this.voiceArray[v].wavePos%=this.squareWaveLen;
                }
                else if ((this.voiceArray[v].voiceWaveform&0x8)==0x8) // noize
                {
                    curSamp=this.getNextRandom()/256.0;
                }
                else if ((this.voiceArray[v].voiceWaveform&0xf)==0x0) // no sound
                {
                }
                else
                {
                    // combination of waveforms?
                }

                curSamp*=this.globalVolume/15.0;
                finalSample+=curSamp;
            }
        }

        return finalSample;
    }

    readRegister(addr)
    {
        addr=(addr&0x1f)|0xd400;

        if ((addr == 0xd419) || (addr == 0xd41a))
        {
            // A/D converters
            this.lastSidByte = 0;
            return 0xff;
        }
        else if ((addr==0xd41b) || (addr==0xd41c))
        {
            // Voice 3 oscillator/envelope gen readout
            this.lastSidByte = 0;
            var r=Math.floor(Math.random()*0xff);
            return r;
        }
        /*else
        {
            console.log("SID::Unmapped read from address ["+addr.toString(16)+"]");
        }*/
        
        return this.lastSidByte;
    }

    writeRegister(addr,value)
    {
        addr=(addr&0x1f)|0xd400;
        this.lastSidByte=value;
        this.eventsQueue.push([value,addr,this.internalClock]);

        if (addr==0xd418)
        {
            //console.log("SID::wrote to 0xd418 "+value.toString(16));
        }
    }
}
