import { EventEmitter } from 'events';
import { HybridStorage } from '../storage/types';

/**
 * Transaction interface representing a blockchain transaction
 */
export interface Transaction {
  signature: string;
  from: string;
  to?: string;
  amount: number;
  tokenAddress?: string;
  programIds?: string[];
  timestamp: Date;
  blockNumber: number;
  success: boolean;
  fee?: number;
  metadata?: Record<string, any>;
}

/**
 * An interface representing a condition for triggering an alert
 */
export interface AlertCondition {
  id: string;
  type: 'amount' | 'wallet' | 'program' | 'token' | 'frequency' | 'pattern' | 'custom';
  
  // Condition-specific parameters
  params: {
    // For amount conditions
    minAmount?: number;
    maxAmount?: number;
    token?: string;
    
    // For wallet conditions
    walletIds?: string[];
    walletTags?: string[];
    
    // For program conditions
    programIds?: string[];
    programTags?: string[];
    
    // For token conditions
    tokenAddress?: string;
    
    // For frequency conditions
    timeWindow?: number; // in milliseconds
    minCount?: number;
    maxCount?: number;
    
    // For pattern conditions
    sequenceLength?: number;
    sequencePattern?: string[];
    
    // For custom conditions
    customMatchFn?: (transaction: Transaction) => boolean;
    
    // Additional parameters
    threshold?: number;
  };
}

/**
 * An interface representing an action to be taken when an alert is triggered
 */
export interface AlertAction {
  id: string;
  type: 'notification' | 'email' | 'webhook' | 'tag' | 'log' | 'custom';
  
  // Action-specific parameters
  params: {
    // For notification actions
    title?: string;
    message?: string;
    severity?: 'info' | 'warning' | 'critical';
    
    // For email actions
    recipients?: string[];
    emailTemplate?: string;
    
    // For webhook actions
    webhookUrl?: string;
    webhookMethod?: 'GET' | 'POST' | 'PUT';
    webhookHeaders?: Record<string, string>;
    
    // For tag actions
    tagName?: string;
    tagValue?: string;
    
    // For custom actions
    customActionFn?: (alert: Alert, transaction: Transaction) => Promise<void>;
  };
}

/**
 * An interface representing an alert rule
 */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  
  // Conditions that must be met to trigger this alert
  conditions: AlertCondition[];
  
  // Match mode determines if all conditions must match or just one
  matchMode: 'all' | 'any';
  
  // Actions to take when alert is triggered
  actions: AlertAction[];
  
  // Cooldown period in milliseconds to prevent alert spam
  cooldownPeriod?: number;
  
  // Flag to indicate if this rule should be applied to historical data
  applyToHistorical?: boolean;
  
  // Additional metadata
  metadata?: Record<string, any>;
  
  // Created and updated timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * An interface representing a triggered alert
 */
export interface Alert {
  id: string;
  ruleId: string;
  transactionSignature: string;
  walletIds: string[];
  programIds: string[];
  
  // Details about why this alert was triggered
  triggerReason: string;
  
  // Match details for debugging
  matchedConditions: AlertCondition[];
  
  // Metadata about actions taken
  actionsTaken: Array<{
    actionId: string;
    status: 'success' | 'failure';
    details?: string;
  }>;
  
  // Created timestamp
  createdAt: Date;
  
  // Resolved status
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
}

/**
 * Alert system for monitoring transactions and triggering alerts
 * based on defined rules and conditions
 */
export class AlertSystem extends EventEmitter {
  private storage: HybridStorage;
  private rules: Map<string, AlertRule> = new Map();
  private lastAlertsByRule: Map<string, Date> = new Map();
  private processingQueue: Transaction[] = [];
  private isProcessing: boolean = false;
  
  constructor(storage: HybridStorage) {
    super();
    this.storage = storage;
  }
  
  /**
   * Initialize the alert system
   */
  async initialize(): Promise<void> {
    // Load existing alert rules from storage
    await this.loadRules();
    
    // Set up event listeners
    this.on('newTransaction', this.queueTransaction.bind(this));
    this.on('alertTriggered', this.saveAlert.bind(this));
    
    console.log(`Alert system initialized with ${this.rules.size} rules`);
  }
  
  /**
   * Load alert rules from storage
   */
  private async loadRules(): Promise<void> {
    try {
      const result = await this.storage.timeSeries.query('alert_rules', {});
      
      // Process the result and add rules to the map
      for (const entry of result) {
        const rule = entry.data as AlertRule;
        
        // Skip disabled rules
        if (!rule.enabled) {
          continue;
        }
        
        this.rules.set(rule.id, rule);
      }
    } catch (error) {
      console.error('Error loading alert rules:', error);
    }
  }
  
  /**
   * Add or update an alert rule
   */
  async addRule(rule: AlertRule): Promise<string> {
    // Ensure the rule has an ID
    if (!rule.id) {
      rule.id = `rule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    
    // Set timestamps
    rule.updatedAt = new Date();
    if (!rule.createdAt) {
      rule.createdAt = new Date();
    }
    
    // Store rule in time-series database
    await this.storage.timeSeries.insert('alert_rules', {
      timestamp: rule.updatedAt,
      data: rule,
      tags: {
        ruleId: rule.id,
        enabled: rule.enabled.toString()
      }
    });
    
    // Add rule to the map if enabled
    if (rule.enabled) {
      this.rules.set(rule.id, rule);
    } else {
      this.rules.delete(rule.id);
    }
    
    return rule.id;
  }
  
  /**
   * Remove an alert rule
   */
  async removeRule(ruleId: string): Promise<void> {
    // Delete from time-series database (logical delete)
    await this.storage.timeSeries.insert('alert_rules', {
      timestamp: new Date(),
      data: {
        id: ruleId,
        deleted: true,
        updatedAt: new Date()
      },
      tags: {
        ruleId,
        deleted: 'true'
      }
    });
    
    // Remove rule from the map
    this.rules.delete(ruleId);
  }
  
  /**
   * Get all alert rules
   */
  async getRules(): Promise<AlertRule[]> {
    return Array.from(this.rules.values());
  }
  
  /**
   * Process a new transaction
   */
  processTransaction(transaction: Transaction): void {
    this.emit('newTransaction', transaction);
  }
  
  /**
   * Queue a transaction for processing
   */
  private queueTransaction(transaction: Transaction): void {
    this.processingQueue.push(transaction);
    
    // Start processing if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }
  }
  
  /**
   * Process the transaction queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue.length === 0 || this.isProcessing) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      while (this.processingQueue.length > 0) {
        const transaction = this.processingQueue.shift()!;
        await this.evaluateTransaction(transaction);
      }
    } catch (error) {
      console.error('Error processing transaction queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Evaluate a transaction against all rules
   */
  private async evaluateTransaction(transaction: Transaction): Promise<void> {
    // Use Array.from() to convert Map entries to array for iteration
    for (const [ruleId, rule] of Array.from(this.rules.entries())) {
      // Skip if rule is on cooldown
      if (this.isRuleOnCooldown(rule)) {
        continue;
      }
      
      // Evaluate rule conditions
      const { isMatch, matchedConditions } = this.evaluateRuleConditions(rule, transaction);
      
      if (isMatch) {
        // Create alert object
        const alert: Alert = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          ruleId: rule.id,
          transactionSignature: transaction.signature,
          walletIds: [transaction.from, transaction.to].filter(Boolean) as string[],
          programIds: transaction.programIds || [],
          triggerReason: `Transaction matched rule: ${rule.name}`,
          matchedConditions,
          actionsTaken: [],
          createdAt: new Date(),
          resolved: false
        };
        
        // Execute alert actions
        await this.executeAlertActions(alert, transaction, rule);
        
        // Update cooldown timestamp
        if (rule.cooldownPeriod) {
          this.lastAlertsByRule.set(rule.id, new Date());
        }
        
        // Emit alert event
        this.emit('alertTriggered', alert);
      }
    }
  }
  
  /**
   * Check if a rule is on cooldown
   */
  private isRuleOnCooldown(rule: AlertRule): boolean {
    if (!rule.cooldownPeriod) {
      return false;
    }
    
    const lastAlertTime = this.lastAlertsByRule.get(rule.id);
    if (!lastAlertTime) {
      return false;
    }
    
    const now = new Date();
    const elapsedTime = now.getTime() - lastAlertTime.getTime();
    
    return elapsedTime < rule.cooldownPeriod;
  }
  
  /**
   * Evaluate a rule's conditions against a transaction
   */
  private evaluateRuleConditions(
    rule: AlertRule,
    transaction: Transaction
  ): { isMatch: boolean; matchedConditions: AlertCondition[] } {
    const matchedConditions: AlertCondition[] = [];
    
    for (const condition of rule.conditions) {
      const isConditionMatch = this.evaluateCondition(condition, transaction);
      
      if (isConditionMatch) {
        matchedConditions.push(condition);
      }
      
      // If match mode is 'any' and we have a match, we can stop checking
      if (rule.matchMode === 'any' && matchedConditions.length > 0) {
        break;
      }
    }
    
    // Determine if rule matches based on match mode
    const isMatch = rule.matchMode === 'all'
      ? matchedConditions.length === rule.conditions.length
      : matchedConditions.length > 0;
    
    return { isMatch, matchedConditions };
  }
  
  /**
   * Evaluate a single condition against a transaction
   */
  private evaluateCondition(condition: AlertCondition, transaction: Transaction): boolean {
    switch (condition.type) {
      case 'amount':
        return this.evaluateAmountCondition(condition, transaction);
      
      case 'wallet':
        return this.evaluateWalletCondition(condition, transaction);
      
      case 'program':
        return this.evaluateProgramCondition(condition, transaction);
      
      case 'token':
        return this.evaluateTokenCondition(condition, transaction);
      
      case 'custom':
        return this.evaluateCustomCondition(condition, transaction);
      
      // Other condition types require historical data and are evaluated separately
      default:
        return false;
    }
  }
  
  /**
   * Evaluate an amount condition
   */
  private evaluateAmountCondition(condition: AlertCondition, transaction: Transaction): boolean {
    const { minAmount, maxAmount, token } = condition.params;
    
    // If token is specified, check that transaction involves this token
    if (token && transaction.tokenAddress !== token) {
      return false;
    }
    
    // Check amount against range
    const amount = transaction.amount;
    
    if (minAmount !== undefined && amount < minAmount) {
      return false;
    }
    
    if (maxAmount !== undefined && amount > maxAmount) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Evaluate a wallet condition
   */
  private evaluateWalletCondition(condition: AlertCondition, transaction: Transaction): boolean {
    const { walletIds, walletTags } = condition.params;
    
    // Check if transaction involves any of the specified wallets
    if (walletIds && walletIds.length > 0) {
      if (
        (transaction.from && walletIds.includes(transaction.from)) ||
        (transaction.to && walletIds.includes(transaction.to))
      ) {
        return true;
      }
    }
    
    // For tag-based matching, we need additional logic to fetch wallets with the specified tags
    // This would typically involve a call to a tag service
    // For simplicity, we'll assume this is not implemented yet
    
    return false;
  }
  
  /**
   * Evaluate a program condition
   */
  private evaluateProgramCondition(condition: AlertCondition, transaction: Transaction): boolean {
    const { programIds, programTags } = condition.params;
    
    // Check if transaction involves any of the specified programs
    if (programIds && programIds.length > 0 && transaction.programIds) {
      for (const programId of transaction.programIds) {
        if (programIds.includes(programId)) {
          return true;
        }
      }
    }
    
    // Similar to wallet tags, program tag matching would require additional logic
    
    return false;
  }
  
  /**
   * Evaluate a token condition
   */
  private evaluateTokenCondition(condition: AlertCondition, transaction: Transaction): boolean {
    const { tokenAddress } = condition.params;
    
    // Check if transaction involves the specified token
    return tokenAddress !== undefined && transaction.tokenAddress === tokenAddress;
  }
  
  /**
   * Evaluate a custom condition
   */
  private evaluateCustomCondition(condition: AlertCondition, transaction: Transaction): boolean {
    const { customMatchFn } = condition.params;
    
    // If a custom match function is provided, use it
    if (customMatchFn) {
      try {
        return customMatchFn(transaction);
      } catch (error) {
        console.error(`Error evaluating custom condition ${condition.id}:`, error);
        return false;
      }
    }
    
    return false;
  }
  
  /**
   * Execute alert actions
   */
  private async executeAlertActions(
    alert: Alert,
    transaction: Transaction,
    rule: AlertRule
  ): Promise<void> {
    for (const action of rule.actions) {
      try {
        await this.executeAction(action, alert, transaction);
        
        // Record successful action
        alert.actionsTaken.push({
          actionId: action.id,
          status: 'success'
        });
      } catch (error) {
        console.error(`Error executing action ${action.id}:`, error);
        
        // Record failed action
        alert.actionsTaken.push({
          actionId: action.id,
          status: 'failure',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }
  
  /**
   * Execute a single alert action
   */
  private async executeAction(
    action: AlertAction,
    alert: Alert,
    transaction: Transaction
  ): Promise<void> {
    switch (action.type) {
      case 'notification':
        await this.executeNotificationAction(action, alert, transaction);
        break;
      
      case 'email':
        await this.executeEmailAction(action, alert, transaction);
        break;
      
      case 'webhook':
        await this.executeWebhookAction(action, alert, transaction);
        break;
      
      case 'tag':
        await this.executeTagAction(action, alert, transaction);
        break;
      
      case 'log':
        this.executeLogAction(action, alert, transaction);
        break;
      
      case 'custom':
        await this.executeCustomAction(action, alert, transaction);
        break;
    }
  }
  
  /**
   * Execute a notification action
   */
  private async executeNotificationAction(
    action: AlertAction,
    alert: Alert,
    transaction: Transaction
  ): Promise<void> {
    const { title, message, severity } = action.params;
    
    // In a real implementation, this would send a notification
    // For now, we'll just log it
    console.log(`[Alert Notification] ${severity?.toUpperCase() || 'INFO'}: ${title}`);
    console.log(`Message: ${message}`);
    console.log(`Transaction: ${transaction.signature}`);
  }
  
  /**
   * Execute an email action
   */
  private async executeEmailAction(
    action: AlertAction,
    alert: Alert,
    transaction: Transaction
  ): Promise<void> {
    const { recipients, emailTemplate } = action.params;
    
    // In a real implementation, this would send an email
    // For now, we'll just log it
    console.log(`[Alert Email] Would send email to ${recipients?.join(', ')}`);
    console.log(`Template: ${emailTemplate}`);
    console.log(`Transaction: ${transaction.signature}`);
  }
  
  /**
   * Execute a webhook action
   */
  private async executeWebhookAction(
    action: AlertAction,
    alert: Alert,
    transaction: Transaction
  ): Promise<void> {
    const { webhookUrl, webhookMethod, webhookHeaders } = action.params;
    
    // In a real implementation, this would send an HTTP request to the webhook URL
    // For now, we'll just log it
    console.log(`[Alert Webhook] Would send ${webhookMethod} request to ${webhookUrl}`);
    console.log(`Headers: ${JSON.stringify(webhookHeaders)}`);
    console.log(`Alert data: ${JSON.stringify(alert)}`);
  }
  
  /**
   * Execute a tag action
   */
  private async executeTagAction(
    action: AlertAction,
    alert: Alert,
    transaction: Transaction
  ): Promise<void> {
    const { tagName, tagValue } = action.params;
    
    // In a real implementation, this would add tags to the involved entities
    // For now, we'll just log it
    console.log(`[Alert Tag] Would add tag ${tagName}=${tagValue} to wallets:`);
    console.log(`Wallets: ${alert.walletIds.join(', ')}`);
  }
  
  /**
   * Execute a log action
   */
  private executeLogAction(
    action: AlertAction,
    alert: Alert,
    transaction: Transaction
  ): void {
    // Log the alert to the console
    console.log(`[ALERT] ${alert.triggerReason}`);
    console.log(`Transaction: ${transaction.signature}`);
    console.log(`Matched conditions: ${alert.matchedConditions.length}`);
    console.log(`Alert ID: ${alert.id}`);
  }
  
  /**
   * Execute a custom action
   */
  private async executeCustomAction(
    action: AlertAction,
    alert: Alert,
    transaction: Transaction
  ): Promise<void> {
    const { customActionFn } = action.params;
    
    // If a custom action function is provided, use it
    if (customActionFn) {
      await customActionFn(alert, transaction);
    }
  }
  
  /**
   * Save an alert to storage
   */
  private async saveAlert(alert: Alert): Promise<void> {
    try {
      // Store alert in time-series database
      await this.storage.timeSeries.insert('alerts', {
        timestamp: alert.createdAt,
        data: alert,
        tags: {
          ruleId: alert.ruleId,
          transactionSignature: alert.transactionSignature,
          resolved: alert.resolved.toString()
        }
      });
    } catch (error) {
      console.error('Error saving alert:', error);
    }
  }
  
  /**
   * Get alerts by transaction
   */
  async getAlertsByTransaction(transactionSignature: string): Promise<Alert[]> {
    try {
      const result = await this.storage.timeSeries.query('alerts', {
        tags: {
          transactionSignature
        }
      });
      
      return result.map(entry => entry.data as Alert);
    } catch (error) {
      console.error('Error fetching alerts by transaction:', error);
      return [];
    }
  }
  
  /**
   * Get alerts by rule
   */
  async getAlertsByRule(ruleId: string, options?: { resolved?: boolean }): Promise<Alert[]> {
    try {
      const tags: Record<string, string> = { ruleId };
      
      if (options?.resolved !== undefined) {
        tags.resolved = options.resolved.toString();
      }
      
      const result = await this.storage.timeSeries.query('alerts', { tags });
      
      return result.map(entry => entry.data as Alert);
    } catch (error) {
      console.error('Error fetching alerts by rule:', error);
      return [];
    }
  }
  
  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy: string, notes?: string): Promise<boolean> {
    try {
      // Find the alert first
      const result = await this.storage.timeSeries.query('alerts', {
        limit: 1,
        tags: {
          alertId
        }
      });
      
      if (result.length === 0) {
        return false;
      }
      
      const alert = result[0].data as Alert;
      
      // Update alert status
      alert.resolved = true;
      alert.resolvedAt = new Date();
      alert.resolvedBy = resolvedBy;
      alert.resolutionNotes = notes;
      
      // Save updated alert
      await this.storage.timeSeries.insert('alerts', {
        timestamp: alert.resolvedAt,
        data: alert,
        tags: {
          ruleId: alert.ruleId,
          transactionSignature: alert.transactionSignature,
          resolved: 'true',
          alertId
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error resolving alert:', error);
      return false;
    }
  }
  
  /**
   * Run alert rules against historical data
   */
  async runHistoricalAnalysis(
    startTime: Date,
    endTime: Date,
    ruleIds?: string[]
  ): Promise<number> {
    let alertCount = 0;
    
    try {
      // Get rules to apply
      const rulesToApply = ruleIds
        ? ruleIds.map(id => this.rules.get(id)).filter(Boolean) as AlertRule[]
        : Array.from(this.rules.values()).filter(rule => rule.applyToHistorical);
      
      if (rulesToApply.length === 0) {
        return 0;
      }
      
      // Query transactions in the specified time range
      const transactions = await this.storage.timeSeries.query('transactions', {
        startTime: startTime,
        endTime: endTime,
        limit: 1000 // Add reasonable limit
      });
      
      // Process each transaction against the selected rules
      for (const entry of transactions) {
        const transaction = entry.data as Transaction;
        
        for (const rule of rulesToApply) {
          const { isMatch, matchedConditions } = this.evaluateRuleConditions(rule, transaction);
          
          if (isMatch) {
            // Create alert object
            const alert: Alert = {
              id: `alert_hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              ruleId: rule.id,
              transactionSignature: transaction.signature,
              walletIds: [transaction.from, transaction.to].filter(Boolean) as string[],
              programIds: transaction.programIds || [],
              triggerReason: `Historical analysis matched rule: ${rule.name}`,
              matchedConditions,
              actionsTaken: [],
              createdAt: new Date(),
              resolved: false
            };
            
            // Save the alert but don't execute actions
            await this.saveAlert(alert);
            alertCount++;
          }
        }
      }
    } catch (error) {
      console.error('Error running historical analysis:', error);
    }
    
    return alertCount;
  }
} 