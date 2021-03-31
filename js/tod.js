/* TOD - c64 clock */

class tod
{
    constructor()
    {
        this.tod10th_bcd=0;
        this.todsec_bcd=0;
        this.todmin_bcd=0;
        this.todhour_bcd=0;

        this.alarm10th_bcd=0;
        this.alarmsec_bcd=0;
        this.alarmmin_bcd=0;
        this.alarmhour_bcd=0;

        this.tod_halt=false;

        this.reload();
    }

    reload()
    {
        const c64freq = 1022727; // 1mhz
        this.todTicker=Math.floor(c64freq/10);
    }

    update(elapsedCycles)
    {
        this.todTicker-=elapsedCycles;
        if (this.todTicker<=0)
        {
            var reminder=-this.todTicker;
            this.reload();
            this.todTicker-=reminder;

            this.tod10th_bcd+=1;
            if (this.tod10th_bcd>9)            
            {
                this.tod10th_bcd=0;

                var lo = ((this.todsec_bcd & 0x0f) + 1)&0xff;
                var hi = (this.todsec_bcd >> 4)&0x0f;
                if (lo > 9)
                {
                    lo = 0;
                    hi++;
                }

                if (hi > 5)
                {
                    this.todsec_bcd=0;

                    lo = ((this.todmin_bcd & 0x0f) + 1)&0xff;
                    hi = (this.todmin_bcd >> 4)&0x0f;

                    if (lo > 9)
                    {
                        lo = 0;
                        hi++;
                    }

                    if (hi > 5)
                    {
                        this.todmin_bcd = 0;

                        lo = ((this.todhour_bcd & 0x0f) + 1)&0xff;
                        hi = ((this.todhour_bcd >> 4) & 1)&0xff;
                        this.todhour_bcd &= 0x80;		// Keep AM/PM flag

                        if (lo > 9)
                        {
                            lo = 0;
                            hi++;
                        }

                        this.todhour_bcd |= ((hi << 4) | lo)&0xff;

                        if ((this.todhour_bcd & 0x1f) > 0x11)
                        {
                            this.todhour_bcd=(this.todhour_bcd & 0x80 ^ 0x80)&0xff;
                        }
                    }
                    else
                    {
                        this.todmin_bcd=((hi << 4) | lo)&0xff;
                    }
                }
                else
                {
                    this.todsec_bcd=((hi << 4) | lo)&0xff;
                }
            }

            // check for alarm time


        }
    }
}
