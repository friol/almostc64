/* fake sid */

class sid
{
    constructor()
    {

    }

    readRegister(addr)
    {
        if (addr==0xd41b)
        {
            // Voice #3 waveform output. read-only.
            var r=Math.floor(Math.random()*0xff);
            return r;
        }
        else
        {
            console.log("SID::Unmapped read from address ["+addr.toString(16)+"]");
        }
        
        return 0x0;
    }


}
