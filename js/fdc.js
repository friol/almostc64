/* floppy disk controller 1541 */

class fdc1541
{
    constructor()
    {
        this.spinCounter=0;
    }

    moveHeadIn()
    {
        console.log("fdc::head moves in");
    }

    moveHeadOut()
    {
        console.log("fdc::head moves out");
    }

    syncFound()
    {
        if (this.spinCounter>=10000)
        {
            this.spinCounter=0;
            return 0x80;            
        }

        return 0x00;
    }

    step()
    {
        this.spinCounter+=1;
    }
}
