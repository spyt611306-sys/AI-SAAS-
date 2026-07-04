import { SourceAdapter } from "@/lib/sources/types";
import { DataGoKrAdapter } from "@/lib/sources/data-go-kr";
import { PublicPageAdapter } from "@/lib/sources/public-pages";

const adapters: SourceAdapter[] = [
  new DataGoKrAdapter("pps-bid"),
  new DataGoKrAdapter("pps-award"),
  new DataGoKrAdapter("pps-plan"),
  new DataGoKrAdapter("lh-bid"),
  new DataGoKrAdapter("kepco-api"),
  new PublicPageAdapter("kogas-page"),
  new PublicPageAdapter("ecredible-page"),
  new PublicPageAdapter("hhi-page")
];

export function getAdapter(sourceId: string): SourceAdapter | undefined {
  return adapters.find((adapter) => adapter.sourceId === sourceId);
}
