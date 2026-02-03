"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import seed from "@/data/seed.json";
import type {
  CountryProfile,
  CustomsGroup,
  GlobalParams,
  Product,
  ProductLineInput,
  ProductRate,
  SimulationResult,
  TransportEdge,
  TransportNode
} from "@/types";
import { findBestPath, type PathCriteria } from "@/lib/dijkstra";
import { computeCustoms, computeRegulationAlerts } from "@/lib/customs";

export type SelectionMode = "start" | "end";

interface AppState {
  nodes: TransportNode[];
  edges: TransportEdge[];
  customsGroups: CustomsGroup[];
  productCatalog: Product[];
  countryProfiles: CountryProfile[];
  globalParams: GlobalParams;
  selectedCountryId: string;
  startNodeId: string;
  endNodeId: string;
  selectionMode: SelectionMode;
  criteria: PathCriteria;
  alpha: number;
  productLines: ProductLineInput[];
  simulationResult: SimulationResult;
  setSelectionMode: (mode: SelectionMode) => void;
  setStartNodeId: (id: string) => void;
  setEndNodeId: (id: string) => void;
  setSelectedCountryId: (id: string) => void;
  setCriteria: (criteria: PathCriteria) => void;
  setAlpha: (alpha: number) => void;
  addProductLine: () => void;
  updateProductLine: (index: number, line: Partial<ProductLineInput>) => void;
  removeProductLine: (index: number) => void;
  computeSimulation: () => void;
  updateCountryProfile: (id: string, updater: (profile: CountryProfile) => CountryProfile) => void;
  updateEdge: (id: string, updater: (edge: TransportEdge) => TransportEdge) => void;
  setGlobalParams: (params: GlobalParams) => void;
  importProductsAndRates: (countryId: string, products: Product[], productRates: Record<string, ProductRate>) => void;
  resetCountryToSeed: (countryId: string) => void;
  resetAll: () => void;
  importState: (state: PersistedState) => void;
}

export interface PersistedState {
  nodes: TransportNode[];
  edges: TransportEdge[];
  customsGroups: CustomsGroup[];
  productCatalog: Product[];
  countryProfiles: CountryProfile[];
  globalParams: GlobalParams;
}

const initialState: PersistedState = {
  nodes: seed.nodes,
  edges: seed.edges,
  customsGroups: seed.customsGroups,
  productCatalog: seed.productCatalog,
  countryProfiles: seed.countryProfiles,
  globalParams: seed.globalParams
};

const defaultProductLine = (productCatalog: Product[]): ProductLineInput => ({
  productId: productCatalog[0]?.id ?? "",
  qty: 1
});

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,
      selectedCountryId: seed.countryProfiles[0]?.id ?? "",
      startNodeId: seed.nodes[0]?.id ?? "",
      endNodeId: seed.nodes[3]?.id ?? "",
      selectionMode: "start",
      criteria: "cost",
      alpha: 0.6,
      productLines: [defaultProductLine(seed.productCatalog)],
      simulationResult: { route: null, customs: null, regulations: [], grand_total: 0 },
      setSelectionMode: (mode) => set({ selectionMode: mode }),
      setStartNodeId: (id) => set({ startNodeId: id }),
      setEndNodeId: (id) => set({ endNodeId: id }),
      setSelectedCountryId: (id) => set({ selectedCountryId: id }),
      setCriteria: (criteria) => set({ criteria }),
      setAlpha: (alpha) => set({ alpha }),
      addProductLine: () => {
        const catalog = get().productCatalog;
        set((state) => ({
          productLines: [...state.productLines, defaultProductLine(catalog)]
        }));
      },
      updateProductLine: (index, line) => {
        set((state) => {
          const updated = [...state.productLines];
          updated[index] = { ...updated[index], ...line };
          return { productLines: updated };
        });
      },
      removeProductLine: (index) => {
        set((state) => ({
          productLines: state.productLines.filter((_, idx) => idx !== index)
        }));
      },
      computeSimulation: () => {
        const { nodes, edges, startNodeId, endNodeId, criteria, alpha, globalParams } = get();
        const route = findBestPath(nodes, edges, startNodeId, endNodeId, criteria, globalParams, alpha);
        const selectedCountry = get().countryProfiles.find((country) => country.id === get().selectedCountryId);
        if (!selectedCountry) return;

        const transportTotal = route?.totals.total_cost ?? 0;
        const customs = computeCustoms({
          country: selectedCountry,
          productLines: get().productLines,
          productCatalog: get().productCatalog,
          transportTotal
        });

        const regulations = computeRegulationAlerts(
          selectedCountry,
          get().productLines,
          get().productCatalog
        );

        const grandTotal = transportTotal + customs.total_customs;
        set({ simulationResult: { route, customs, regulations, grand_total: grandTotal } });
      },
      updateCountryProfile: (id, updater) => {
        set((state) => ({
          countryProfiles: state.countryProfiles.map((country) =>
            country.id === id ? updater(country) : country
          )
        }));
      },
      updateEdge: (id, updater) => {
        set((state) => ({
          edges: state.edges.map((edge) => (edge.id === id ? updater(edge) : edge))
        }));
      },
      setGlobalParams: (params) => set({ globalParams: params }),
      importProductsAndRates: (countryId, products, productRates) => {
        set((state) => {
          const catalogMap = new Map(state.productCatalog.map((product) => [product.id, product]));
          products.forEach((product) => catalogMap.set(product.id, product));

          return {
            productCatalog: Array.from(catalogMap.values()),
            countryProfiles: state.countryProfiles.map((country) =>
              country.id === countryId
                ? {
                    ...country,
                    customs: {
                      ...country.customs,
                      productRates: {
                        ...country.customs.productRates,
                        ...productRates
                      }
                    }
                  }
                : country
            )
          };
        });
      },
      resetCountryToSeed: (countryId) => {
        const seedProfile = seed.countryProfiles.find((country) => country.id === countryId);
        if (!seedProfile) return;
        set((state) => ({
          countryProfiles: state.countryProfiles.map((country) =>
            country.id === countryId ? seedProfile : country
          )
        }));
      },
      resetAll: () => set({
        ...initialState,
        selectedCountryId: seed.countryProfiles[0]?.id ?? "",
        startNodeId: seed.nodes[0]?.id ?? "",
        endNodeId: seed.nodes[3]?.id ?? "",
        selectionMode: "start",
        criteria: "cost",
        alpha: 0.6,
        productLines: [defaultProductLine(seed.productCatalog)],
        simulationResult: { route: null, customs: null, regulations: [], grand_total: 0 }
      }),
      importState: (state) => set({
        ...state,
        selectedCountryId: state.countryProfiles[0]?.id ?? "",
        startNodeId: state.nodes[0]?.id ?? "",
        endNodeId: state.nodes[3]?.id ?? "",
        selectionMode: "start",
        criteria: "cost",
        alpha: 0.6,
        productLines: [defaultProductLine(state.productCatalog)],
        simulationResult: { route: null, customs: null, regulations: [], grand_total: 0 }
      })
    }),
    {
      name: "logistics-simulator",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        customsGroups: state.customsGroups,
        productCatalog: state.productCatalog,
        countryProfiles: state.countryProfiles,
        globalParams: state.globalParams
      })
    }
  )
);
