import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_ARCHETYPES,
  customerInterested,
  rollCustomerArchetype,
} from '../src/systems/customers.ts';
import type { CreatureItem, LootItem } from '../src/types.ts';

const loot: LootItem = { kind: 'loot', id: 'x', name: 'Minério', baseValue: 25, quantity: 1 };
const rareLoot: LootItem = { kind: 'loot', id: 'y', name: 'Gema', baseValue: 50, quantity: 1 };
const creature: CreatureItem = {
  kind: 'creature',
  speciesId: 'lumimorcego',
  name: 'Lumimorcego',
  baseValue: 65,
};

describe('customers', () => {
  it('has six archetypes with weights', () => {
    expect(CUSTOMER_ARCHETYPES).toHaveLength(6);
    expect(CUSTOMER_ARCHETYPES.reduce((s, c) => s + c.weight, 0)).toBe(100);
  });

  it('minerador prefers loot', () => {
    expect(customerInterested('minerador', loot)).toBe(true);
    expect(customerInterested('minerador', creature)).toBe(false);
  });

  it('crianca prefers creatures', () => {
    expect(customerInterested('crianca', creature)).toBe(true);
    expect(customerInterested('crianca', loot)).toBe(false);
  });

  it('colecionador wants high value', () => {
    expect(customerInterested('colecionador', rareLoot)).toBe(true);
    expect(customerInterested('colecionador', loot)).toBe(false);
  });

  it('rollCustomerArchetype is deterministic with rng', () => {
    const a = rollCustomerArchetype(() => 0);
    expect(a.id).toBe('morador');
  });
});
