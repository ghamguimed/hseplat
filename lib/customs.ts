import type {
  CountryProfile,
  CustomsSummary,
  Product,
  ProductLineInput,
  RegulationAlert
} from "@/types";

interface CustomsInput {
  country: CountryProfile;
  productLines: ProductLineInput[];
  productCatalog: Product[];
  transportTotal: number;
}

const safeNumber = (value?: number): number => (Number.isFinite(value) ? (value as number) : 0);

export const computeCustoms = ({
  country,
  productLines,
  productCatalog,
  transportTotal
}: CustomsInput): CustomsSummary => {
  const productMap = new Map(productCatalog.map((product) => [product.id, product]));

  const totalByValue = productLines.reduce((sum, line) => {
    const product = productMap.get(line.productId);
    const declared = safeNumber(line.declaredValueOverride ?? product?.defaultDeclaredValue);
    return sum + declared * line.qty;
  }, 0);

  const totalByWeight = productLines.reduce((sum, line) => {
    const product = productMap.get(line.productId);
    const weight = safeNumber(line.weight_kg ?? product?.weight_kg);
    return sum + weight * line.qty;
  }, 0);

  const totalByVolume = productLines.reduce((sum, line) => {
    const product = productMap.get(line.productId);
    const volume = safeNumber(line.volume_m3 ?? product?.volume_m3);
    return sum + volume * line.qty;
  }, 0);

  const allocationMethod = country.customs.allocation_method;

  const lines = productLines.map((line) => {
    const product = productMap.get(line.productId);
    const declaredValue = safeNumber(line.declaredValueOverride ?? product?.defaultDeclaredValue);
    const declaredTotal = declaredValue * line.qty;
    const insurance = country.customs.insurance_rate * declaredValue;

    let allocBase = totalByValue;
    let lineBase = declaredTotal;

    if (allocationMethod === "by_weight" && totalByWeight > 0) {
      allocBase = totalByWeight;
      lineBase = safeNumber(line.weight_kg ?? product?.weight_kg) * line.qty;
    }

    if (allocationMethod === "by_volume" && totalByVolume > 0) {
      allocBase = totalByVolume;
      lineBase = safeNumber(line.volume_m3 ?? product?.volume_m3) * line.qty;
    }

    if (allocBase === 0) {
      allocBase = totalByValue || 1;
      lineBase = declaredTotal;
    }

    const transportAlloc = transportTotal * (lineBase / allocBase);
    const cif = declaredTotal + transportAlloc + insurance;

    const productRate = country.customs.productRates[line.productId];
    const groupRate = product?.defaultCustomsGroupId
      ? country.customs.groupRates[product.defaultCustomsGroupId]
      : undefined;

    const dutyRate = productRate?.duty_rate_pct ?? groupRate?.duty_rate_pct ?? country.customs.default_duty_rate_pct;
    const vatRate = productRate?.vat_rate_pct ?? groupRate?.vat_rate_pct ?? country.customs.default_vat_rate_pct;
    const rateSource = productRate
      ? "Product rate"
      : groupRate
        ? "Group rate"
        : "Default rate";

    const duty = cif * dutyRate;
    const vat = (cif + duty) * vatRate;
    const extra = safeNumber(productRate?.extra_fees_fixed) * line.qty;

    return {
      productId: line.productId,
      qty: line.qty,
      declared_value: declaredValue,
      insurance,
      transport_alloc: transportAlloc,
      cif,
      duty,
      vat,
      extra,
      total_customs_product: duty + vat + extra,
      rate_source: rateSource
    };
  });

  const totalCustoms = country.customs.clearance_fee + lines.reduce((sum, line) => sum + line.total_customs_product, 0);

  return {
    clearance_fee: country.customs.clearance_fee,
    total_customs: totalCustoms,
    lines
  };
};

export const computeRegulationAlerts = (
  country: CountryProfile,
  productLines: ProductLineInput[],
  productCatalog: Product[]
): RegulationAlert[] => {
  const productMap = new Map(productCatalog.map((product) => [product.id, product]));
  const productIds = new Set(productLines.map((line) => line.productId));
  const groupIds = new Set(
    productLines
      .map((line) => productMap.get(line.productId)?.defaultCustomsGroupId)
      .filter((value): value is string => Boolean(value))
  );

  return country.regulations
    .filter((reg) => {
      const appliesProducts = reg.appliesToProducts?.some((id) => productIds.has(id)) ?? false;
      const appliesGroups = reg.appliesToGroups?.some((id) => groupIds.has(id)) ?? false;
      return appliesProducts || appliesGroups || (!reg.appliesToProducts && !reg.appliesToGroups);
    })
    .map((reg) => ({
      id: reg.id,
      title: reg.title,
      severity: reg.severity,
      message: reg.message
    }));
};
