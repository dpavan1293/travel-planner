// Dev-only export preview — renders the export HTML locally with dummy data.
// Accessible at /dev-export?template=classic (or waves).
// No DB needed: uses hardcoded sample itinerary data.

import { useEffect } from "react";
import { buildParts, renderExportTemplate } from "./exportTemplate.js";
import { TEMPLATES, EXPORT_TEMPLATE } from "./exportTemplateHtml.js";

const DUMMY_DATA = {
  tripTitle: "Indonesia Segreta – Banggai & Togean Islands",
  country: "Indonesia",
  continent: "Asia",
  description:
    "Due settimane tra isole incontaminate, spiagge deserte, lagune cristalline, snorkeling, foreste tropicali e villaggi di palafitte negli arcipelaghi Banggai e Togean, in Sulawesi.",
  difficulty: "difficile",
  budget: "alto",
  bestPeriod: "Agosto",
  transport:
    "Volo interno A/R Giacarta–Luwuk, trasferimenti in auto, traghetti locali e barche tra le isole.",
  tips:
    "I voli intercontinentali A/R dall'Italia a Giacarta non sono inclusi. Il visto d'ingresso va fatto online prima del volo.",
  coverImageUrl: "",
  days: {
    "2026-08-18": {
      place: "Giacarta",
      activities: [
        "Arrivo a Giacarta",
        "Check-in in hotel",
        "Cena di gruppo",
        "Passeggiata tra mercati locali",
      ],
      accommodation: "Hotel",
      categories: ["citta", "cultura"],
      image: "",
    },
    "2026-08-19": {
      place: "Luwuk → Salakan",
      activities: [
        "Volo interno da Giacarta a Luwuk",
        "Escursione alla Piala Waterfall",
        "Traghetto verso le Banggai Islands",
      ],
      accommodation: "Hotel a Salakan",
      categories: ["avventura", "trasferimento"],
      image: "",
    },
    "2026-08-20": {
      place: "Banggai Laut",
      activities: [
        "Escursione in barca a Mandel Beach",
        "Nuoto e snorkeling",
        "Osservazione del Cardinal Fish",
      ],
      accommodation: "Hotel a Salakan",
      categories: ["mare", "animali"],
      image: "",
    },
    "2026-08-21": {
      place: "Luk Panenteng",
      activities: [
        "Visita a Paisupok Lake",
        "Kayak o SUP",
        "Sosta a Poganda Beach",
      ],
      accommodation: "Hotel a Salakan",
      categories: ["mare", "avventura"],
      image: "",
    },
    "2026-08-22": {
      place: "Banggai → Luwuk",
      activities: [
        "Relax a Pompon Beach",
        "Tour culinario locale",
        "Traghetto verso Luwuk al tramonto",
      ],
      accommodation: "Hotel a Luwuk",
      categories: ["mare", "cultura"],
      image: "",
    },
  },
  extras: [
    {
      id: "costs-1",
      type: "costs",
      title: "Costi esclusi",
      lines: [
        { desc: "Visto d'ingresso in Indonesia", value: "25 €" },
        { desc: "Tour in barca alle Togean", value: "10–15 € al giorno" },
        { desc: "Traghetto Luwuk–Banggai", value: "7 € A/R" },
      ],
    },
    {
      id: "notes-1",
      type: "notes",
      title: "Note di viaggio",
      lines: [
        { text: "I voli intercontinentali non sono inclusi.", done: false },
        { text: "Il viaggio è programmato dal 18 al 22 agosto 2026.", done: false },
      ],
    },
    {
      id: "packing-1",
      type: "packing",
      title: "Bagaglio",
      lines: [
        { text: "Bagaglio a mano massimo 7 kg.", done: false },
        { text: "Bagaglio da stiva massimo 20 kg.", done: false },
      ],
    },
    {
      id: "flight-1",
      type: "flight",
      title: "Voli",
      flights: [
        {
          number: "GA 210",
          airline: "Garuda Indonesia",
          depCity: "Roma FCO",
          depTime: "09:15",
          arrCity: "Giacarta CGK",
          arrTime: "22:30",
        },
        {
          number: "GA 612",
          airline: "Garuda Indonesia",
          depCity: "Giacarta CGK",
          depTime: "07:00",
          arrCity: "Luwuk LUW",
          arrTime: "08:30",
        },
      ],
    },
    {
      id: "map-1",
      type: "map",
      title: "Mappa",
      locations: [
        { name: "Giacarta", lat: -6.2088, lng: 106.8456 },
        { name: "Luwuk", lat: -0.9472, lng: 122.7875 },
        { name: "Salakan", lat: -1.3333, lng: 123.25 },
      ],
    },
  ],
};

export default function DevExportPreview() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const templateKey = params.get("template") || "classic";
    const tpl = TEMPLATES[templateKey]?.html || EXPORT_TEMPLATE;

    const parts = buildParts(DUMMY_DATA);
    const html = renderExportTemplate(tpl, parts);

    document.open();
    document.write(html);
    document.close();
  }, []);

  return null;
}
