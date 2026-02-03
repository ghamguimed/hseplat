"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import type { CountryProfile, ProductLineInput } from "@/types";
import { importUaeXlsx } from "@/lib/xlsxImporter";

const tabs = [
  { id: "compute", label: "Compute" },
  { id: "country", label: "Country Editor" },
  { id: "routes", label: "Routes Editor" },
  { id: "params", label: "Params" },
  { id: "import", label: "Import XLSX" }
] as const;

type TabId = (typeof tabs)[number]["id"];

const NumberInput = ({
  value,
  onChange,
  step = 0.01
}: {
  value?: number;
  onChange: (value: number) => void;
  step?: number;
}) => (
  <input
    type="number"
    step={step}
    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
    value={Number.isFinite(value) ? value : ""}
    onChange={(event) => onChange(Number(event.target.value))}
  />
);

export const Sidebar = () => {
  const [activeTab, setActiveTab] = useState<TabId>("compute");
  const [xlsxStatus, setXlsxStatus] = useState<string>("Waiting...");
  const [xlsxPreview, setXlsxPreview] = useState<string[]>([]);

  const {
    nodes,
    edges,
    productCatalog,
    countryProfiles,
    selectedCountryId,
    startNodeId,
    endNodeId,
    selectionMode,
    criteria,
    alpha,
    productLines,
    simulationResult,
    globalParams,
    setSelectionMode,
    setStartNodeId,
    setEndNodeId,
    setSelectedCountryId,
    setCriteria,
    setAlpha,
    addProductLine,
    updateProductLine,
    removeProductLine,
    computeSimulation,
    updateCountryProfile,
    updateEdge,
    setGlobalParams,
    importProductsAndRates,
    resetCountryToSeed,
    resetAll,
    importState
  } = useAppStore();

  const selectedCountry = useMemo(
    () => countryProfiles.find((country) => country.id === selectedCountryId),
    [countryProfiles, selectedCountryId]
  );

  useEffect(() => {
    const fetchDefault = async () => {
      try {
        const response = await fetch("/data/Frais Douaniers.xlsx");
        if (!response.ok) throw new Error("No default file");
        const buffer = await response.arrayBuffer();
        if (selectedCountry) {
          const result = importUaeXlsx(buffer, selectedCountry);
          importProductsAndRates("uae", result.products, result.productRates);
          setXlsxPreview(result.products.slice(0, 5).map((product) => product.label));
          setXlsxStatus(`Loaded default UAE file with ${result.products.length} lines.`);
        }
      } catch (error) {
        setXlsxStatus("Default file not found. Please upload.");
      }
    };

    fetchDefault();
  }, [importProductsAndRates, selectedCountry]);

  const handleUpload = async (file: File) => {
    const buffer = await file.arrayBuffer();
    if (!selectedCountry) return;
    const result = importUaeXlsx(buffer, selectedCountry);
    importProductsAndRates("uae", result.products, result.productRates);
    setXlsxPreview(result.products.slice(0, 5).map((product) => product.label));
    setXlsxStatus(`Imported ${result.products.length} lines from upload.`);
  };

  const handleExport = () => {
    const data = {
      nodes,
      edges,
      customsGroups: useAppStore.getState().customsGroups,
      productCatalog,
      countryProfiles,
      globalParams
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "logistics-simulator.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (file: File) => {
    const text = await file.text();
    const data = JSON.parse(text);
    importState(data);
  };

  const updateCustomsField = (field: keyof CountryProfile["customs"], value: number | string) => {
    if (!selectedCountry) return;
    updateCountryProfile(selectedCountry.id, (profile) => ({
      ...profile,
      customs: {
        ...profile.customs,
        [field]: value
      }
    }));
  };

  const updateTradeField = (field: keyof CountryProfile["trade"], value: string[]) => {
    if (!selectedCountry) return;
    updateCountryProfile(selectedCountry.id, (profile) => ({
      ...profile,
      trade: {
        ...profile.trade,
        [field]: value
      }
    }));
  };

  const updateRegulation = (index: number, field: string, value: string) => {
    if (!selectedCountry) return;
    updateCountryProfile(selectedCountry.id, (profile) => ({
      ...profile,
      regulations: profile.regulations.map((reg, idx) =>
        idx === index ? { ...reg, [field]: value } : reg
      )
    }));
  };

  const updateProductLineField = (index: number, patch: Partial<ProductLineInput>) => {
    updateProductLine(index, patch);
  };

  return (
    <aside className="flex h-full w-full flex-col gap-4 border-r border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`rounded px-3 py-1 text-sm ${
              activeTab === tab.id ? "bg-slate-900 text-white" : "bg-slate-100"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "compute" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Route Selection</h2>
            <div className="mt-2 grid gap-2">
              <div>
                <label className="text-xs text-slate-600">Start node</label>
                <select
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  value={startNodeId}
                  onChange={(event) => setStartNodeId(event.target.value)}
                >
                  {nodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600">End node</label>
                <select
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  value={endNodeId}
                  onChange={(event) => setEndNodeId(event.target.value)}
                >
                  {nodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  className={`flex-1 rounded px-2 py-1 text-xs ${
                    selectionMode === "start" ? "bg-blue-600 text-white" : "bg-slate-100"
                  }`}
                  onClick={() => setSelectionMode("start")}
                >
                  Select start on map
                </button>
                <button
                  className={`flex-1 rounded px-2 py-1 text-xs ${
                    selectionMode === "end" ? "bg-blue-600 text-white" : "bg-slate-100"
                  }`}
                  onClick={() => setSelectionMode("end")}
                >
                  Select end on map
                </button>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold">Products</h2>
            <div className="space-y-2">
              {productLines.map((line, index) => (
                <div key={`${line.productId}-${index}`} className="rounded border border-slate-200 p-2">
                  <div className="grid gap-2">
                    <select
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      value={line.productId}
                      onChange={(event) => updateProductLineField(index, { productId: event.target.value })}
                    >
                      {productCatalog.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.label}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-600">Qty</label>
                        <NumberInput
                          value={line.qty}
                          step={1}
                          onChange={(value) => updateProductLineField(index, { qty: value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-600">Declared override</label>
                        <NumberInput
                          value={line.declaredValueOverride}
                          onChange={(value) => updateProductLineField(index, { declaredValueOverride: value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-600">Weight (kg)</label>
                        <NumberInput
                          value={line.weight_kg}
                          onChange={(value) => updateProductLineField(index, { weight_kg: value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-600">Volume (m³)</label>
                        <NumberInput
                          value={line.volume_m3}
                          onChange={(value) => updateProductLineField(index, { volume_m3: value })}
                        />
                      </div>
                    </div>
                    <button
                      className="rounded bg-red-50 px-2 py-1 text-xs text-red-700"
                      onClick={() => removeProductLine(index)}
                    >
                      Remove line
                    </button>
                  </div>
                </div>
              ))}
              <button className="w-full rounded bg-slate-900 px-2 py-1 text-xs text-white" onClick={addProductLine}>
                Add product
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold">Optimization</h2>
            <div className="grid gap-2">
              <select
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                value={criteria}
                onChange={(event) => setCriteria(event.target.value as typeof criteria)}
              >
                <option value="cost">Cost</option>
                <option value="time">Time</option>
                <option value="weighted">Weighted</option>
              </select>
              {criteria === "weighted" && (
                <div>
                  <label className="text-xs text-slate-600">Alpha (cost weight)</label>
                  <NumberInput value={alpha} step={0.05} onChange={setAlpha} />
                </div>
              )}
              <button
                className="rounded bg-blue-600 px-3 py-2 text-sm text-white"
                onClick={computeSimulation}
              >
                Compute
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Results</h2>
            <div className="rounded border border-slate-200 p-2 text-xs">
              <div>Transport total: {simulationResult.route?.totals.total_cost.toFixed(2) ?? "-"}</div>
              <div>Time (days): {simulationResult.route?.totals.total_time_days.toFixed(2) ?? "-"}</div>
              <div>Grand total: {simulationResult.grand_total.toFixed(2)}</div>
            </div>
            <div className="rounded border border-slate-200 p-2 text-xs">
              <div className="font-semibold">Route nodes</div>
              <ul className="list-disc pl-4">
                {simulationResult.route?.nodes.map((node) => (
                  <li key={node.id}>{node.label}</li>
                )) ?? <li>-</li>}
              </ul>
            </div>
            <div className="rounded border border-slate-200 p-2 text-xs">
              <div className="font-semibold">Customs breakdown</div>
              {simulationResult.customs ? (
                <div className="space-y-2">
                  {simulationResult.customs.lines.map((line) => (
                    <div key={line.productId} className="rounded bg-slate-50 p-2">
                      <div>Product: {productCatalog.find((p) => p.id === line.productId)?.label}</div>
                      <div>Declared: {line.declared_value.toFixed(2)}</div>
                      <div>Insurance: {line.insurance.toFixed(2)}</div>
                      <div>CIF: {line.cif.toFixed(2)}</div>
                      <div>Duty: {line.duty.toFixed(2)}</div>
                      <div>VAT: {line.vat.toFixed(2)}</div>
                      <div>Extra: {line.extra.toFixed(2)}</div>
                      <div>Total customs: {line.total_customs_product.toFixed(2)}</div>
                      <div className="text-slate-500">Rate source: {line.rate_source}</div>
                    </div>
                  ))}
                  <div className="font-semibold">Clearance fee: {simulationResult.customs.clearance_fee}</div>
                  <div className="font-semibold">Total customs: {simulationResult.customs.total_customs.toFixed(2)}</div>
                </div>
              ) : (
                <div>-</div>
              )}
            </div>
            <div className="rounded border border-slate-200 p-2 text-xs">
              <div className="font-semibold">Regulatory alerts</div>
              {simulationResult.regulations.length > 0 ? (
                <ul className="list-disc pl-4">
                  {simulationResult.regulations.map((reg) => (
                    <li key={reg.id}>
                      <span className="font-semibold">[{reg.severity}]</span> {reg.title}: {reg.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <div>-</div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "country" && selectedCountry && (
        <div className="space-y-4 text-sm">
          <div>
            <label className="text-xs text-slate-600">Country</label>
            <select
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
              value={selectedCountryId}
              onChange={(event) => setSelectedCountryId(event.target.value)}
            >
              {countryProfiles.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded border border-slate-200 p-2">
            <div className="font-semibold">Customs</div>
            <div className="grid gap-2">
              <div>
                <label className="text-xs text-slate-600">Clearance fee</label>
                <NumberInput
                  value={selectedCountry.customs.clearance_fee}
                  onChange={(value) => updateCustomsField("clearance_fee", value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Insurance rate</label>
                <NumberInput
                  value={selectedCountry.customs.insurance_rate}
                  onChange={(value) => updateCustomsField("insurance_rate", value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Allocation method</label>
                <select
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  value={selectedCountry.customs.allocation_method}
                  onChange={(event) => updateCustomsField("allocation_method", event.target.value)}
                >
                  <option value="by_value">By value</option>
                  <option value="by_weight">By weight</option>
                  <option value="by_volume">By volume</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600">Default duty rate</label>
                <NumberInput
                  value={selectedCountry.customs.default_duty_rate_pct}
                  onChange={(value) => updateCustomsField("default_duty_rate_pct", value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Default VAT rate</label>
                <NumberInput
                  value={selectedCountry.customs.default_vat_rate_pct}
                  onChange={(value) => updateCustomsField("default_vat_rate_pct", value)}
                />
              </div>
            </div>
            <button
              className="mt-2 rounded bg-slate-100 px-2 py-1 text-xs"
              onClick={() => resetCountryToSeed(selectedCountry.id)}
            >
              Reset country to Gulf defaults
            </button>
          </div>
          <div className="rounded border border-slate-200 p-2">
            <div className="font-semibold">Trade</div>
            <div className="grid gap-2">
              <label className="text-xs text-slate-600">Incoterms</label>
              <textarea
                className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                rows={2}
                value={selectedCountry.trade.incoterms_allowed.join(", ")}
                onChange={(event) =>
                  updateTradeField(
                    "incoterms_allowed",
                    event.target.value.split(",").map((item) => item.trim()).filter(Boolean)
                  )
                }
              />
              <label className="text-xs text-slate-600">Required documents</label>
              <textarea
                className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                rows={2}
                value={selectedCountry.trade.required_documents.join(", ")}
                onChange={(event) =>
                  updateTradeField(
                    "required_documents",
                    event.target.value.split(",").map((item) => item.trim()).filter(Boolean)
                  )
                }
              />
              <label className="text-xs text-slate-600">Import restrictions</label>
              <textarea
                className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                rows={2}
                value={selectedCountry.trade.import_restrictions.join(", ")}
                onChange={(event) =>
                  updateTradeField(
                    "import_restrictions",
                    event.target.value.split(",").map((item) => item.trim()).filter(Boolean)
                  )
                }
              />
              <label className="text-xs text-slate-600">Export restrictions</label>
              <textarea
                className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                rows={2}
                value={selectedCountry.trade.export_restrictions.join(", ")}
                onChange={(event) =>
                  updateTradeField(
                    "export_restrictions",
                    event.target.value.split(",").map((item) => item.trim()).filter(Boolean)
                  )
                }
              />
            </div>
          </div>
          <div className="rounded border border-slate-200 p-2">
            <div className="font-semibold">Regulations</div>
            {selectedCountry.regulations.map((reg, index) => (
              <div key={reg.id} className="mt-2 rounded border border-slate-100 p-2">
                <label className="text-xs text-slate-600">Title</label>
                <input
                  className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                  value={reg.title}
                  onChange={(event) => updateRegulation(index, "title", event.target.value)}
                />
                <label className="text-xs text-slate-600">Severity</label>
                <select
                  className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                  value={reg.severity}
                  onChange={(event) => updateRegulation(index, "severity", event.target.value)}
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="block">Block</option>
                </select>
                <label className="text-xs text-slate-600">Message</label>
                <textarea
                  className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                  rows={2}
                  value={reg.message}
                  onChange={(event) => updateRegulation(index, "message", event.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "routes" && (
        <div className="space-y-3 text-sm">
          {edges.map((edge) => (
            <div key={edge.id} className="rounded border border-slate-200 p-2">
              <div className="font-semibold">{edge.id}</div>
              <div className="grid gap-2">
                <div>
                  <label className="text-xs text-slate-600">Distance (km)</label>
                  <NumberInput
                    value={edge.distance_km}
                    step={1}
                    onChange={(value) =>
                      updateEdge(edge.id, (existing) => ({
                        ...existing,
                        distance_km: value
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600">Mode</label>
                  <select
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                    value={edge.mode}
                    onChange={(event) =>
                      updateEdge(edge.id, (existing) => ({
                        ...existing,
                        mode: event.target.value as "road" | "sea"
                      }))
                    }
                  >
                    <option value="road">Road</option>
                    <option value="sea">Sea</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-600">Override cost/km</label>
                    <NumberInput
                      value={edge.overrides?.cost_per_km}
                      onChange={(value) =>
                        updateEdge(edge.id, (existing) => ({
                          ...existing,
                          overrides: { ...existing.overrides, cost_per_km: value }
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Override speed</label>
                    <NumberInput
                      value={edge.overrides?.avg_speed_kmph}
                      onChange={(value) =>
                        updateEdge(edge.id, (existing) => ({
                          ...existing,
                          overrides: { ...existing.overrides, avg_speed_kmph: value }
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Override fixed fee</label>
                    <NumberInput
                      value={edge.overrides?.fixed_fee}
                      onChange={(value) =>
                        updateEdge(edge.id, (existing) => ({
                          ...existing,
                          overrides: { ...existing.overrides, fixed_fee: value }
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Override dwell (h)</label>
                    <NumberInput
                      value={edge.overrides?.dwell_hours}
                      onChange={(value) =>
                        updateEdge(edge.id, (existing) => ({
                          ...existing,
                          overrides: { ...existing.overrides, dwell_hours: value }
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "params" && (
        <div className="space-y-4 text-sm">
          <div className="rounded border border-slate-200 p-2">
            <div className="font-semibold">Global Params</div>
            <div className="mt-2 grid gap-2">
              <div className="font-medium">Road</div>
              <NumberInput
                value={globalParams.road.cost_per_km}
                onChange={(value) => setGlobalParams({ ...globalParams, road: { ...globalParams.road, cost_per_km: value } })}
              />
              <NumberInput
                value={globalParams.road.avg_speed_kmph}
                onChange={(value) => setGlobalParams({ ...globalParams, road: { ...globalParams.road, avg_speed_kmph: value } })}
              />
              <NumberInput
                value={globalParams.road.fixed_fee}
                onChange={(value) => setGlobalParams({ ...globalParams, road: { ...globalParams.road, fixed_fee: value } })}
              />
              <NumberInput
                value={globalParams.road.dwell_hours}
                onChange={(value) => setGlobalParams({ ...globalParams, road: { ...globalParams.road, dwell_hours: value } })}
              />
              <div className="font-medium">Sea</div>
              <NumberInput
                value={globalParams.sea.cost_per_km}
                onChange={(value) => setGlobalParams({ ...globalParams, sea: { ...globalParams.sea, cost_per_km: value } })}
              />
              <NumberInput
                value={globalParams.sea.avg_speed_kmph}
                onChange={(value) => setGlobalParams({ ...globalParams, sea: { ...globalParams.sea, avg_speed_kmph: value } })}
              />
              <NumberInput
                value={globalParams.sea.fixed_fee}
                onChange={(value) => setGlobalParams({ ...globalParams, sea: { ...globalParams.sea, fixed_fee: value } })}
              />
              <NumberInput
                value={globalParams.sea.dwell_hours}
                onChange={(value) => setGlobalParams({ ...globalParams, sea: { ...globalParams.sea, dwell_hours: value } })}
              />
            </div>
          </div>
          <div className="rounded border border-slate-200 p-2">
            <div className="font-semibold">Persistence</div>
            <div className="mt-2 flex flex-col gap-2">
              <button className="rounded bg-slate-900 px-2 py-1 text-xs text-white" onClick={handleExport}>
                Export JSON
              </button>
              <label className="cursor-pointer rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                Import JSON
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleImportJson(file);
                  }}
                />
              </label>
              <button className="rounded bg-red-50 px-2 py-1 text-xs text-red-700" onClick={resetAll}>
                Reset all to Gulf defaults
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "import" && (
        <div className="space-y-3 text-sm">
          <div className="rounded border border-slate-200 p-2">
            <div className="font-semibold">UAE XLSX Import</div>
            <p className="text-xs text-slate-600">{xlsxStatus}</p>
            <label className="mt-2 inline-flex cursor-pointer items-center rounded bg-slate-900 px-2 py-1 text-xs text-white">
              Upload XLSX
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleUpload(file);
                }}
              />
            </label>
          </div>
          {xlsxPreview.length > 0 && (
            <div className="rounded border border-slate-200 p-2">
              <div className="font-semibold">Preview</div>
              <ul className="list-disc pl-4 text-xs">
                {xlsxPreview.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
