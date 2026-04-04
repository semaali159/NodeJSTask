
import {Campaign  } from './campaign/campaign';
import { DateTime } from 'luxon';
const mockClock = {
    now: () => DateTime.now().setZone('America/New_York').toMillis(),

    setTimeout: (callback: () => void, delayMs: number) => {
        console.log(`⏰ [Clock] Scheduled after ${Math.round(delayMs/1000)} seconds`);
        return setTimeout(callback, Math.min(delayMs, 1500)) as any;
    },

    clearTimeout: (id: any) => {
        clearTimeout(id);
        console.log(`🛑 [Clock] Cleared timeout`);
    }
};

const callHandler = async (phone: string) => {
    const nowNY = DateTime.now().setZone('America/New_York').toFormat('HH:mm:ss');
    console.log(`📞 Calling ${phone} at ${nowNY} (New York Time)`);

    await new Promise(r => setTimeout(r, 800));

    const answered = phone !== '555';   

    return {
        answered,
        durationMs: 2000
    };
};

async function runDemo() {
    console.log("🚀 === Campaign Demo Started ===\n");

    const config = {
        customerList: ['111', '222', '333', '444', '555', '666', '777'],
        startTime: "00:00",
        endTime: "23:59",
        maxConcurrentCalls: 2,
        maxDailyMinutes: 70,       
        timezone: "America/New_York",
        maxRetries: 2,
        retryDelayMs:5000
    };

    const campaign = new Campaign(config as any, callHandler, mockClock as any);

    campaign.start();

    let seconds = 0;
    const monitor = setInterval(() => {
        const status = campaign.getStatus();
        
        console.log(`\n📊 [${seconds}s] Status → ${status.state.toUpperCase()}`);
        console.log(`   Processed: ${status.totalProcessed} | Failed: ${status.totalFailed}`);
        console.log(`   Active Calls: ${status.activeCalls} | Pending Retries: ${status.pendingRetries}`);
        console.log(`   Daily Minutes Used: ${status.dailyMinutesUsed.toFixed(2)} / ${config.maxDailyMinutes}`);

        if (status.state === "completed") {
            clearInterval(monitor);
            console.log("\n✅ Campaign Completed Successfully!");
            console.log(status.totalFailed)
        }

        seconds += 2;
        if (seconds > 120) { 
            clearInterval(monitor);
            console.log("\n⏹️  Demo stopped after timeout");
        }
    }, 2000);
}

runDemo();