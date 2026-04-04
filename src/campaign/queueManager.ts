
interface RetryItem {
  phone: string;
  attempts: number;
  dueTime: number
}

export class QueueManager {
  private queue: string[] = [];
  private retryQueue: RetryItem[] = [];

  constructor(customerList: string[]) {
    this.queue = [...customerList];
  }

  getNext(now: number) {
  if (this.retryQueue.length && this.retryQueue[0].dueTime <= now) {
    const retry = this.retryQueue.shift()!;
    return { phone: retry.phone, attempts: retry.attempts };
  }

  const phone = this.queue.shift();
  return phone ? { phone, attempts: 0 } : null;
}

  addRetry(phone: string, attempts:number, dueTime:number) {
    this.retryQueue.push({phone,attempts,dueTime});
  this.retryQueue.sort((a,b)=> a.dueTime - b.dueTime);
    
  }

  get pendingRetries(){
    return this.retryQueue.length
  }

  get isFullyEmpty(){
    return this.queue.length === 0 && this.retryQueue.length === 0
  }

  get status() {
    return {
      pendingRetries: this.pendingRetries,
      isFullyEmpty: this.isFullyEmpty
    };
  }
}