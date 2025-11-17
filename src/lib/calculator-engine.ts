import {
  CalculatorInput,
  CalculationResult,
  AuctionFee,
  USAShipping,
  OceanShipping,
  CustomsClearance,
  VendorFees,
  TaxCalculation,
  CalculationBreakdown,
  SheetAuction,
  SheetPort,
  SheetUSAShipping,
  SheetBodyTypeModifier,
  SheetCustomsRate,
  SheetPricingRule,
} from '@/types';
import { generateId, addDays } from './utils';

/**
 * Calculator Engine - Core business logic for car shipping cost calculation
 */
export class CalculatorEngine {
  constructor(
    private auctions: SheetAuction[],
    private ports: SheetPort[],
    private usaShipping: SheetUSAShipping[],
    private bodyTypeModifiers: SheetBodyTypeModifier[],
    private customsRates: SheetCustomsRate[],
    private pricingRules: SheetPricingRule[]
  ) {}

  /**
   * Calculate total shipping cost
   */
  calculate(input: CalculatorInput): CalculationResult {
    // 1. Calculate auction fee
    const auctionFee = this.calculateAuctionFee(input);

    // 2. Calculate USA shipping
    const usaShipping = this.calculateUSAShipping(input);

    // 3. Calculate ocean shipping
    const oceanShipping = this.calculateOceanShipping(input);

    // 4. Calculate customs clearance
    const customsClearance = this.calculateCustomsClearance(input, auctionFee, usaShipping, oceanShipping);

    // 5. Calculate vendor fees
    const vendorFees = this.calculateVendorFees(input);

    // 6. Calculate tax (if requested)
    let tax: TaxCalculation | undefined;
    if (input.calculateTax) {
      tax = this.calculateTax(input, auctionFee, usaShipping, oceanShipping, customsClearance, vendorFees);
    }

    // Build breakdown
    const breakdown: CalculationBreakdown = {
      auctionFee,
      usaShipping,
      oceanShipping,
      customsClearance,
      vendorFees,
      tax,
    };

    // Calculate total
    const total =
      auctionFee.amount +
      usaShipping.amount +
      oceanShipping.amount +
      customsClearance.amount +
      vendorFees.amount +
      (tax?.amount || 0);

    // Build result
    const result: CalculationResult = {
      id: generateId('calc'),
      breakdown,
      total,
      currency: 'USD',
      calculatedAt: new Date(),
      validUntil: addDays(new Date(), 30),
      vendorId: input.vendorId,
      inputData: input,
    };

    return result;
  }

  /**
   * Calculate auction buyer fee
   */
  private calculateAuctionFee(input: CalculatorInput): AuctionFee {
    const auction = this.auctions.find((a) => a.auction_id === input.auctionId);

    if (!auction) {
      // Fallback to Copart default tiered structure
      return this.calculateDefaultAuctionFee(input.carPrice);
    }

    let buyerFee = 0;
    const gateFee = auction.gate_fee || 0;

    switch (auction.buyer_fee_type) {
      case 'fixed':
        buyerFee = parseFloat(auction.buyer_fee_value);
        break;

      case 'percentage':
        buyerFee = input.carPrice * (parseFloat(auction.buyer_fee_value) / 100);
        break;

      case 'tiered':
        try {
          const tiers = JSON.parse(auction.buyer_fee_value);
          buyerFee = this.calculateTieredFee(input.carPrice, tiers);
        } catch {
          buyerFee = this.calculateDefaultAuctionFee(input.carPrice).amount;
        }
        break;
    }

    const total = buyerFee + gateFee;

    return {
      amount: total,
      gateFee,
      formula: `Buyer Fee: $${buyerFee.toFixed(0)} + Gate Fee: $${gateFee}`,
      description: `${auction.name} auction fees`,
    };
  }

  /**
   * Calculate default Copart-style tiered fee
   */
  private calculateDefaultAuctionFee(carPrice: number): AuctionFee {
    let fee = 0;

    if (carPrice < 100) {
      fee = 1;
    } else if (carPrice < 500) {
      fee = 25;
    } else if (carPrice < 1000) {
      fee = 50;
    } else if (carPrice < 1500) {
      fee = 75;
    } else {
      fee = 100 + (carPrice - 1500) * 0.02; // 2% above $1500
    }

    return {
      amount: fee + 75, // +$75 gate fee
      gateFee: 75,
      formula: 'Tiered structure based on car price',
      description: 'Default auction fees',
    };
  }

  /**
   * Calculate tiered fee from tier structure
   */
  private calculateTieredFee(
    amount: number,
    tiers: Array<{ min: number; max: number; fee: number; percentageAbove?: number }>
  ): number {
    for (const tier of tiers) {
      if (amount >= tier.min && amount <= tier.max) {
        if (tier.percentageAbove && amount > tier.min) {
          return tier.fee + (amount - tier.min) * (tier.percentageAbove / 100);
        }
        return tier.fee;
      }
    }
    return 0;
  }

  /**
   * Calculate USA inland shipping
   */
  private calculateUSAShipping(input: CalculatorInput): USAShipping {
    // Find route
    const port = this.ports.find((p) => p.port_id === input.portDestination);
    const usPort = port ? this.findUSPort(input.stateOrigin) : null;

    const route = this.usaShipping.find(
      (r) =>
        r.state_from === input.stateOrigin &&
        (r.vendor_id === input.vendorId || !r.vendor_id)
    );

    let distance = route?.distance_miles || 1000; // Default 1000 miles
    let pricePerMile = route?.price_per_mile || 1.5; // Default $1.5/mile
    let baseFee = route?.base_price || 200; // Default $200

    // Get body type modifier
    const modifier = this.bodyTypeModifiers.find(
      (m) =>
        m.body_type === input.bodyType &&
        (m.vendor_id === input.vendorId || !m.vendor_id)
    );

    const modifiers: Array<{ name: string; amount: number }> = [];

    // Apply body type modifier
    if (modifier && modifier.usa_shipping_modifier !== 0) {
      modifiers.push({
        name: `${input.bodyType} surcharge`,
        amount: modifier.usa_shipping_modifier,
      });
    }

    // Apply non-running surcharge
    if (!input.isRunning) {
      const nonRunningRule = this.pricingRules.find(
        (r) => r.rule_type === 'nonrunning_surcharge' && r.active
      );
      const surcharge = nonRunningRule?.value || 100;
      modifiers.push({
        name: 'Non-running vehicle',
        amount: surcharge,
      });
    }

    // Apply damage surcharge
    if (input.hasDamage && input.damageType && input.damageType !== 'none') {
      const damageRule = this.pricingRules.find(
        (r) => r.rule_type === 'damage_surcharge' && r.active
      );
      const surcharge = damageRule?.value || 50;
      modifiers.push({
        name: `${input.damageType} damage`,
        amount: surcharge,
      });
    }

    const modifiersTotal = modifiers.reduce((sum, m) => sum + m.amount, 0);
    const total = baseFee + distance * pricePerMile + modifiersTotal;

    return {
      amount: total,
      distance,
      pricePerMile,
      baseFee,
      modifiers,
      formula: `$${baseFee} + (${distance} miles × $${pricePerMile}) + modifiers`,
      description: `Inland shipping from ${input.stateOrigin} to US port`,
    };
  }

  /**
   * Find US port for state
   */
  private findUSPort(state: string): string {
    const portMap: Record<string, string> = {
      CA: 'Port of Los Angeles',
      TX: 'Port of Houston',
      FL: 'Port of Jacksonville',
      NY: 'Port of Newark',
      GA: 'Port of Savannah',
      WA: 'Port of Seattle',
    };
    return portMap[state] || 'Nearest US Port';
  }

  /**
   * Calculate ocean shipping
   */
  private calculateOceanShipping(input: CalculatorInput): OceanShipping {
    const port = this.ports.find(
      (p) =>
        p.port_id === input.portDestination &&
        (p.vendor_id === input.vendorId || !p.vendor_id)
    );

    let baseShipping = port?.base_ocean_shipping || 1200; // Default $1200

    // Get body type modifier
    const modifier = this.bodyTypeModifiers.find(
      (m) =>
        m.body_type === input.bodyType &&
        (m.vendor_id === input.vendorId || !m.vendor_id)
    );

    if (modifier && modifier.ocean_shipping_modifier !== 0) {
      baseShipping += modifier.ocean_shipping_modifier;
    }

    const portFee = 100; // Standard port fee
    const total = baseShipping + portFee;

    return {
      amount: total,
      containerType: 'roro', // Default to RoRo
      estimatedDays: 30, // Default 30 days
      portFee,
      formula: `Base shipping: $${baseShipping} + Port fee: $${portFee}`,
      description: `Ocean shipping to ${port?.name || 'destination port'}`,
    };
  }

  /**
   * Calculate customs clearance
   */
  private calculateCustomsClearance(
    input: CalculatorInput,
    auctionFee: AuctionFee,
    usaShipping: USAShipping,
    oceanShipping: OceanShipping
  ): CustomsClearance {
    const port = this.ports.find((p) => p.port_id === input.portDestination);
    const country = port?.country || 'Ukraine';

    const customsRate = this.customsRates.find((r) => r.country === country);

    const dutyRate = customsRate?.duty_rate || 10; // Default 10%
    const clearanceFee = customsRate?.base_clearance_fee || 150;
    const brokerFee = customsRate?.broker_fee || 200;

    // Calculate duty base (car price + auction + USA shipping + ocean)
    const dutyBase = input.carPrice + auctionFee.amount + usaShipping.amount + oceanShipping.amount;
    const dutyAmount = dutyBase * (dutyRate / 100);

    const total = dutyAmount + clearanceFee + brokerFee;

    return {
      amount: total,
      dutyRate,
      dutyAmount,
      customsFee: clearanceFee,
      brokerFee,
      formula: `(${dutyBase.toFixed(0)} × ${dutyRate}%) + $${clearanceFee} + $${brokerFee}`,
      description: `Customs clearance in ${country}`,
    };
  }

  /**
   * Calculate vendor fees
   */
  private calculateVendorFees(input: CalculatorInput): VendorFees {
    const serviceFeeRule = this.pricingRules.find(
      (r) =>
        r.rule_type === 'service_fee' &&
        r.active &&
        (r.vendor_id === input.vendorId || !r.vendor_id)
    );

    const docFeeRule = this.pricingRules.find(
      (r) =>
        r.rule_type === 'documentation_fee' &&
        r.active &&
        (r.vendor_id === input.vendorId || !r.vendor_id)
    );

    const serviceFee = serviceFeeRule?.value || 500;
    const documentationFee = docFeeRule?.value || 200;

    const additionalFees: Array<{ name: string; amount: number; description?: string }> = [];

    // Add any other vendor-specific fees
    const vendorRules = this.pricingRules.filter(
      (r) =>
        r.vendor_id === input.vendorId &&
        r.active &&
        !['service_fee', 'documentation_fee', 'nonrunning_surcharge', 'damage_surcharge'].includes(
          r.rule_type
        )
    );

    for (const rule of vendorRules) {
      additionalFees.push({
        name: rule.rule_type,
        amount: rule.value,
      });
    }

    const additionalTotal = additionalFees.reduce((sum, fee) => sum + fee.amount, 0);
    const total = serviceFee + documentationFee + additionalTotal;

    return {
      amount: total,
      serviceFee,
      documentationFee,
      additionalFees,
      description: 'Vendor service fees',
    };
  }

  /**
   * Calculate tax (VAT)
   */
  private calculateTax(
    input: CalculatorInput,
    auctionFee: AuctionFee,
    usaShipping: USAShipping,
    oceanShipping: OceanShipping,
    customsClearance: CustomsClearance,
    vendorFees: VendorFees
  ): TaxCalculation {
    const port = this.ports.find((p) => p.port_id === input.portDestination);
    const country = port?.country || 'Ukraine';

    const customsRate = this.customsRates.find((r) => r.country === country);
    const vatRate = customsRate?.vat_rate || 20; // Default 20%

    // Tax base = car price + all fees
    const taxableAmount =
      input.carPrice +
      auctionFee.amount +
      usaShipping.amount +
      oceanShipping.amount +
      customsClearance.amount +
      vendorFees.amount;

    const taxAmount = taxableAmount * (vatRate / 100);

    return {
      amount: taxAmount,
      rate: vatRate,
      taxableAmount,
      formula: `${taxableAmount.toFixed(0)} × ${vatRate}%`,
      description: `VAT (${vatRate}%)`,
    };
  }
}


