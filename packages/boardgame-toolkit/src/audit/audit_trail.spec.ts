import { describe, expect, it } from 'vitest';
import { AuditTrail } from './audit_trail.js';

describe('AuditTrail', () => {
	it('records sensitive actions and supports filtering', () => {
		const audit = new AuditTrail<'p1' | 'p2'>();

		audit.append({
			action: 'session.view',
			actorId: 'p1',
			targetType: 'session',
			targetId: 's-1',
		});

		audit.appendSensitive({
			action: 'session.resume',
			actorId: 'p1',
			targetType: 'session',
			targetId: 's-1',
			severity: 'warning',
		});

		expect(audit.listAll()).toHaveLength(2);
		expect(audit.listSensitive()).toHaveLength(1);
		expect(audit.filterByActor('p1')).toHaveLength(2);
		expect(audit.filterByAction('session.resume')).toHaveLength(1);
	});

	it('supports snapshot roundtrip', () => {
		const audit = new AuditTrail<'p1'>();
		audit.appendSensitive({
			action: 'permission.grant',
			actorId: 'p1',
			targetType: 'role',
			targetId: 'moderator',
		});

		const restored = AuditTrail.fromSnapshot(audit.toSnapshot());
		expect(restored.listAll()).toHaveLength(1);
		expect(restored.listAll()[0]?.action).toBe('permission.grant');
		expect(restored.listAll()[0]?.sensitive).toBe(true);
	});

	it('produces deterministic stable json serialization', () => {
		const auditA = new AuditTrail<'p1'>();
		const auditB = new AuditTrail<'p1'>();

		auditA.appendSensitive({
			action: 'state.patch',
			actorId: 'p1',
			metadata: { z: 1, a: { y: 2, x: 1 } },
			occurredAt: '2026-01-01T00:00:00.000Z',
		});

		auditB.appendSensitive({
			action: 'state.patch',
			actorId: 'p1',
			metadata: { a: { x: 1, y: 2 }, z: 1 },
			occurredAt: '2026-01-01T00:00:00.000Z',
		});

		expect(auditA.toStableJson()).toBe(auditB.toStableJson());
	});

	it('validates critical input', () => {
		const audit = new AuditTrail<'p1'>();
		expect(() => audit.append({ action: '', actorId: 'p1' })).toThrow('Audit action is required');
		expect(() =>
			audit.append({
				action: 'ok',
				actorId: 'p1',
				schemaVersion: 0,
			})
		).toThrow('schemaVersion');
	});
});
