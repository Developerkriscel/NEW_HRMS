import React, { useState } from 'react'
import { CreditCard, CheckCircle2, AlertCircle, Zap, Shield, Crown } from 'lucide-react'

export function SubscriptionSection() {
  const [billingCycle, setBillingCycle] = useState('monthly')

  // Mock current subscription data
  const currentPlan = 'Professional'
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + 15) // Expires in 15 days
  
  const today = new Date()
  const timeDiff = expiryDate.getTime() - today.getTime()
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24))
  
  const isExpiringSoon = daysRemaining <= 15

  const PLANS = [
    {
      name: 'Starter',
      icon: Shield,
      priceMonthly: '₹2,499',
      priceYearly: '₹24,000',
      description: 'Perfect for small teams getting started with HR.',
      features: ['Up to 50 employees', 'Core HR & Onboarding', 'Basic Leave Management', 'Standard Support'],
      current: currentPlan === 'Starter'
    },
    {
      name: 'Professional',
      icon: Zap,
      priceMonthly: '₹4,999',
      priceYearly: '₹48,000',
      description: 'Advanced features for growing organizations.',
      features: ['Up to 250 employees', 'Advanced Payroll', 'Performance Reviews', 'Priority Support', 'Custom Workflows'],
      current: currentPlan === 'Professional',
      popular: true
    },
    {
      name: 'Enterprise',
      icon: Crown,
      priceMonthly: 'Custom',
      priceYearly: 'Custom',
      description: 'Full-suite HRMS for large scale enterprises.',
      features: ['Unlimited employees', 'Dedicated Success Manager', 'Custom Integrations', 'SLA Guarantee', 'Advanced Analytics'],
      current: currentPlan === 'Enterprise'
    }
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Current Subscription Header */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" /> Subscription & Billing
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your NexaHR plan, billing cycle, and payment methods.</p>
        </div>
        
        {/* Billing Cycle Toggle */}
        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex text-sm font-semibold border border-slate-200 dark:border-slate-700 shadow-inner">
          <button 
            className={`px-4 py-2 rounded-lg transition-all ${billingCycle === 'monthly' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button 
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Current Plan Alert/Card */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6 ${isExpiringSoon ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/30' : 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800/30'}`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${isExpiringSoon ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'}`}>
            {isExpiringSoon ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              {currentPlan} Plan
              <span className={`ml-3 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${isExpiringSoon ? 'bg-amber-200/50 text-amber-700 dark:bg-amber-800/40 dark:text-amber-300' : 'bg-emerald-200/50 text-emerald-700 dark:bg-emerald-800/40 dark:text-emerald-300'}`}>
                {isExpiringSoon ? 'Expiring Soon' : 'Active'}
              </span>
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Your subscription will renew/expire on <strong>{expiryDate.toLocaleDateString()}</strong>.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-black text-slate-900 dark:text-white">{daysRemaining}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Days Left</p>
          </div>
          <button className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-transform hover:scale-105 ${isExpiringSoon ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-500/20' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            Renew Now
          </button>
        </div>
      </div>

      {/* Available Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon
          const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly
          
          return (
            <div key={plan.name} className={`relative flex flex-col bg-white dark:bg-slate-800 rounded-3xl border-2 transition-all duration-300 ${plan.popular ? 'border-blue-500 shadow-xl shadow-blue-500/10 scale-[1.02]' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600'}`}>
              
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-md">
                  Most Popular
                </div>
              )}
              
              <div className="p-8 border-b border-slate-100 dark:border-slate-700">
                <div className={`w-12 h-12 rounded-2xl mb-6 flex items-center justify-center ${plan.popular ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-slate-50 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 h-10">{plan.description}</p>
                <div className="mt-6 flex items-end gap-1">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">{price}</span>
                  {price !== 'Custom' && <span className="text-slate-500 font-medium mb-1">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>}
                </div>
              </div>

              <div className="p-8 flex-1 flex flex-col">
                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300 font-medium">
                      <CheckCircle2 className={`w-5 h-5 shrink-0 ${plan.popular ? 'text-blue-500' : 'text-emerald-500'}`} />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <button 
                  disabled={plan.current}
                  className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all ${
                    plan.current 
                      ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                      : plan.popular
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02]'
                        : 'bg-white text-slate-900 border-2 border-slate-200 hover:border-slate-900 dark:bg-transparent dark:text-white dark:border-slate-700 dark:hover:border-white'
                  }`}
                >
                  {plan.current ? 'Current Plan' : price === 'Custom' ? 'Contact Sales' : 'Upgrade Plan'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
