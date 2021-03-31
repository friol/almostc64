/* fake sid */

class sid
{
    constructor()
    {
        this.sidNumVoices=3;
        this.lastSidByte=0;

        this.voiceFreqArray=new Array(this.sidNumVoices*2); // low-high
        this.voicePwArray=new Array(this.sidNumVoices*2); // low-high


    }

    readRegister(addr)
    {
        if ((addr == 0xd419) || (addr == 0xd41a))
        {
            // A/D converters
            this.lastSidByte = 0;
            return 0xff;
        }
        else if ((addr==0xd41b) || (addr==0xd41c))
        {
            // Voice 3 oscillator/EG readout
            this.lastSidByte = 0;
            var r=Math.floor(Math.random()*0xff);
            return r;
        }
        else
        {
            console.log("SID::Unmapped read from address ["+addr.toString(16)+"]");
        }
        
        return this.lastSidByte;
    }

    writeRegister(addr,value)
    {
        if (addr==0xd400)
        {
            this.voiceFreqArray[0]=value;
        }
        else if (addr==0xd401)
        {
            this.voiceFreqArray[1]=value;
        }
        else if (addr==0xd407)
        {
            this.voiceFreqArray[2]=value;
        }
        else if (addr==0xd408)
        {
            this.voiceFreqArray[3]=value;
        }
        else if (addr==0xd40e)
        {
            this.voiceFreqArray[4]=value;
        }
        else if (addr==0xd40f)
        {
            this.voiceFreqArray[5]=value;
        }




        this.lastSidByte=value;
    }


}
