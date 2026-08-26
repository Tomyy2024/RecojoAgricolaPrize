# Security Specification: Recojo Fruto Campo (AgroField)

## 1. Data Invariants
- Admin user: `gestionaq26@gmail.com` has full access to configure, administer and manage records.
- Authenticated field workers and supervisors can read programs, trabajadores and catalogs.
- Supervisors and admins can create and update validations (`/validaciones/`), crate harvest entries (`/detalle_jabas/`), and daily programs (`/programas/`).
- Validation records must enforce strictly valid data types, timestamps, and character boundaries.
- All documents require valid alphanumeric IDs (<= 128 characters).

## 2. The Dirty Dozen Payloads (Rejection Matrix)
1. **Unauthenticated Write**: Writing to `/validaciones/val_1` without authentication -> `PERMISSION_DENIED`.
2. **Invalid ID Injection**: Document ID containing malicious characters like `<script>` or `/../` -> `PERMISSION_DENIED`.
3. **Payload Oversize**: Trying to inject a 10MB string into `observacionesGenerales` -> `PERMISSION_DENIED`.
4. **Invalid Role Escalation**: User updating their own profile to assign `rol: 'Administrador'` -> `PERMISSION_DENIED`.
5. **Negative Count Injection**: Submitting a validation with negative `jabasConformes: -50` -> `PERMISSION_DENIED`.
6. **Phantom Status Spoofing**: Setting `estado` to an unauthorized enum value like `Hacked` -> `PERMISSION_DENIED`.
7. **Malformed DNI**: Submitting worker with empty or non-string DNI -> `PERMISSION_DENIED`.
8. **Shadow Fields**: Submitting unknown shadow properties to `/app_state/` -> `PERMISSION_DENIED`.
9. **Unverified Email Access**: Writing administrative documents with unverified email token -> `PERMISSION_DENIED`.
10. **Direct Admin Bypass**: Attempting to delete master catalogs without administrator privilege -> `PERMISSION_DENIED`.
11. **Client Delegation List Attack**: Querying records without authenticated context -> `PERMISSION_DENIED`.
12. **Timestamp Tampering**: Trying to inject arbitrary non-timestamp format strings in creation dates -> `PERMISSION_DENIED`.
