import  {
    CallHandler,
    IClock,
    CampaignConfig,
    ICampaign,
    CampaignState,
    CampaignStatus
} from  '../interfaces';
import { QueueManager } from './queueManager';
import * as TimeUtils from "./timeHelper";

export class Campaign implements ICampaign{

    private config: CampaignConfig;
    private state: CampaignState = "idle";
    private activeCalls = 0
    private totalProcessed = 0
    private totalFailed = 0
    private dailyMinutesUsed = 0
    private lastDay =''
    private queueManager: QueueManager;
    private pendingTimeout : number | null = null
    constructor(
    config: CampaignConfig,
    private callHandler: CallHandler,
    private clock: IClock
){
    this.config = {
        ...config,
        maxRetries: config.maxRetries ?? 2,
        retryDelayMs: config.retryDelayMs ?? 3600000,
        timezone: config.timezone ?? 'UTC'
    }
    this.queueManager = new QueueManager(this.config.customerList);
    this.lastDay = TimeUtils.getDayIdentifier(this.clock.now(),this.config.timezone);
}
start(): void {
    if(this.state !== "idle") return;
    this.state = 'running'
    this.schedule()

}

pause(): void {
    if(this.state !== "running") return
    this.state = "paused";
    this.clearPendingTimeout()

}
resume(): void {
    if (this.state !== "paused") return;
    this.state = "running";
    this.schedule();
}
getStatus(): CampaignStatus {
      return {
      state: this.state,
      totalProcessed: this.totalProcessed,
      totalFailed: this.totalFailed,
      activeCalls: this.activeCalls,
      pendingRetries: this.queueManager.status.pendingRetries,
      dailyMinutesUsed: Number(this.dailyMinutesUsed.toFixed(2))
    };
}

private clearPendingTimeout() {
        if (this.pendingTimeout !== null) {
            this.clock.clearTimeout(this.pendingTimeout);
            this.pendingTimeout = null;
        }
    }

private schedule(){
    this.clearPendingTimeout()
    if(this.state !== 'running') return;

    const now = this.clock.now()
    const tz= this.config.timezone || 'UTC'
    this.resetDailyIfNeeded(now,tz)

    // check if we are outside working hour
    if(!TimeUtils.isWithinWorkingHours(now,this.config.startTime, this.config.endTime, tz)){
       this.pendingTimeout =  this.clock.setTimeout(()=> this.schedule(), TimeUtils.msUntilStart(now,this.config.startTime,tz))
        return
    }

    // Check if we reach daily limit 
    if(this.dailyMinutesUsed >= this.config.maxDailyMinutes){
        this.pendingTimeout = this.clock.setTimeout(()=> this.schedule(),TimeUtils.msUntilNextDay(now,tz))
         console.log(`🛑 Daily limit reached. Waiting until next day.`);
        return
    }

   this.tryNextCall()

}

private tryNextCall(){
    if(this.state !== 'running') return
    if(this.activeCalls >= this.config.maxConcurrentCalls) return

    const now = this.clock.now()
    const next = this.queueManager.getNext(now)

    if(!next){
        this.checkCompletion()
        return
    }
    this.makeCall(next.phone, next.attempts)

}
private async makeCall(phone: string, attempts:number){

    this.activeCalls++;
    try{
        const result = await this.callHandler(phone)
        this.dailyMinutesUsed += result.durationMs/ 60000

        if(result.answered){
            this.totalProcessed++;
        }else{
            this.handleRetry(phone,attempts)
        }
    }catch(err){
         console.error(`Call error for ${phone}:`, err);
        this.handleRetry(phone,attempts)
    }finally{
        this.activeCalls--;
        this.clock.setTimeout(()=> this.tryNextCall(),0)
        this.clock.setTimeout(()=> this.checkForDueRetries(), this.config.retryDelayMs + 100);
    }
}
private handleRetry(phone:string, attempts:number){
    if(attempts < this.config.maxRetries){
        const dueTime = this.clock.now() + this.config.retryDelayMs
        this.queueManager.addRetry(phone, attempts+1, dueTime)
         console.log(`🔄 Scheduled retry for ${phone} (attempt ${attempts + 1}/${this.config.maxRetries}) in 5 seconds`);
     } else {
        this.totalFailed++;
        console.log(`❌ ${phone} permanently failed after ${this.config.maxRetries} retries`);
   }
}

private resetDailyIfNeeded(now: number,zone:string) {
    const currentDay = TimeUtils.getDayIdentifier(now,zone);
    if (currentDay !== this.lastDay) {
      this.dailyMinutesUsed = 0;
      this.lastDay = currentDay;
    }
  }

  private checkCompletion() {
    if (this.queueManager.status.isFullyEmpty && this.activeCalls === 0) {
      this.state = "completed";
    }
  }
  private checkForDueRetries() {
    if (this.state !== 'running') return;
    if (this.activeCalls >= this.config.maxConcurrentCalls) return;

    this.tryNextCall();
}

}