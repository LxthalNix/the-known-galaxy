interface FilterableEvent {
  era: string;
  factions: readonly string[];
  types: readonly string[];
  importance: string;
}
interface EventFilters { era: string[]; faction: string[]; type: string[]; importance: string[] }

/** OR within a category, AND between categories; Both requires both factions. */
export function matchesFilters(event: FilterableEvent, filters: EventFilters): boolean {
  return (!filters.era.length || filters.era.includes(event.era))
    && (!filters.faction.length || filters.faction.some((faction) => faction === 'both' ? event.factions.includes('jedi') && event.factions.includes('sith') : event.factions.includes(faction)))
    && (!filters.type.length || filters.type.some((type) => event.types.includes(type)))
    && (!filters.importance.length || filters.importance.includes(event.importance));
}
