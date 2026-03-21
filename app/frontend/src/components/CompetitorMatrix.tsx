import { GitCompareArrows, Check, X } from "lucide-react";

type Competitor = {
  name: string;
  photoRecognition: boolean;
  mealPlan: boolean;
  chatbot: boolean;
  behavioralCoaching: boolean;
  barcodeScanner: boolean;
  recipeGeneration: boolean;
  deviceIntegration: boolean;
};

const competitors: Competitor[] = [
  {
    name: "MyFitnessPal",
    photoRecognition: false,
    mealPlan: true,
    chatbot: false,
    behavioralCoaching: false,
    barcodeScanner: true,
    recipeGeneration: false,
    deviceIntegration: true,
  },
  {
    name: "Noom",
    photoRecognition: false,
    mealPlan: true,
    chatbot: false,
    behavioralCoaching: true,
    barcodeScanner: true,
    recipeGeneration: false,
    deviceIntegration: true,
  },
  {
    name: "Foodvisor",
    photoRecognition: true,
    mealPlan: false,
    chatbot: true,
    behavioralCoaching: false,
    barcodeScanner: true,
    recipeGeneration: false,
    deviceIntegration: false,
  },
  {
    name: "SmartEat",
    photoRecognition: true,
    mealPlan: true,
    chatbot: true,
    behavioralCoaching: false,
    barcodeScanner: true,
    recipeGeneration: true,
    deviceIntegration: false,
  },
  {
    name: "Carmen AI",
    photoRecognition: true,
    mealPlan: true,
    chatbot: true,
    behavioralCoaching: true,
    barcodeScanner: false,
    recipeGeneration: true,
    deviceIntegration: false,
  },
  {
    name: "Lifesum / PlateJoy",
    photoRecognition: false,
    mealPlan: true,
    chatbot: false,
    behavioralCoaching: false,
    barcodeScanner: true,
    recipeGeneration: true,
    deviceIntegration: true,
  },
  {
    name: "GPTunnel",
    photoRecognition: true,
    mealPlan: true,
    chatbot: true,
    behavioralCoaching: false,
    barcodeScanner: false,
    recipeGeneration: true,
    deviceIntegration: false,
  },
  {
    name: "Fitia",
    photoRecognition: true,
    mealPlan: true,
    chatbot: false,
    behavioralCoaching: false,
    barcodeScanner: true,
    recipeGeneration: true,
    deviceIntegration: false,
  },
  {
    name: "🚀 Ваше приложение",
    photoRecognition: true,
    mealPlan: true,
    chatbot: true,
    behavioralCoaching: true,
    barcodeScanner: true,
    recipeGeneration: true,
    deviceIntegration: true,
  },
];

const columns: { key: keyof Omit<Competitor, "name">; label: string }[] = [
  { key: "photoRecognition", label: "Фото еды" },
  { key: "mealPlan", label: "План питания" },
  { key: "chatbot", label: "ИИ чат-бот" },
  { key: "behavioralCoaching", label: "Коучинг" },
  { key: "barcodeScanner", label: "Штрих-коды" },
  { key: "recipeGeneration", label: "Рецепты" },
  { key: "deviceIntegration", label: "Устройства" },
];

export default function CompetitorMatrix() {
  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <GitCompareArrows className="w-7 h-7 text-cyan-400" />
        Матрица сравнения конкурентов
      </h2>
      <div className="rounded-xl border border-[#1e1e2e] bg-[#12121a] overflow-x-auto">
        <table className="w-full text-center">
          <thead>
            <tr className="border-b border-[#1e1e2e] bg-[#0d0d14]">
              <th className="px-5 py-4 text-left text-sm font-semibold text-[#8f9bb3] uppercase tracking-wider min-w-[180px]">
                Приложение
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-4 text-sm font-semibold text-[#8f9bb3] uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {competitors.map((comp, i) => {
              const isOurs = comp.name.includes("Ваше");
              return (
                <tr
                  key={i}
                  className={`border-b border-[#1e1e2e] transition-colors ${
                    isOurs
                      ? "bg-gradient-to-r from-green-500/10 to-blue-500/10 hover:from-green-500/15 hover:to-blue-500/15"
                      : i % 2 === 0
                      ? "bg-[#12121a] hover:bg-[#1a1a28]"
                      : "bg-[#0f0f18] hover:bg-[#1a1a28]"
                  }`}
                >
                  <td
                    className={`px-5 py-4 text-left font-medium text-base ${
                      isOurs ? "text-green-400 font-bold" : "text-white"
                    }`}
                  >
                    {comp.name}
                  </td>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-4">
                      {comp[col.key] ? (
                        <Check className="w-5 h-5 text-green-400 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-red-400/50 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}