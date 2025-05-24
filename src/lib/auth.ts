@@ .. @@
 // Default permissions for each role
 export const DEFAULT_PERMISSIONS = {
   admin: [
     'view:letters',
     'create:letters',
     'edit:letters',
     'delete:letters',
     'view:templates',
     'create:templates',
     'edit:templates',
     'delete:templates',
     'view:users',
     'create:users',
     'edit:users',
     'delete:users',
     'view:branches',
     'create:branches',
     'edit:branches',
     'delete:branches',
     'view:settings',
     'edit:settings',
     'view:audit_logs',
     'view:approvals',
     'approve:letters',
     'reject:letters'
   ],
   user: [
     'view:letters',
     'create:letters',
     'edit:letters:own',
     'delete:letters:own',
     'view:templates',
     'request:approval'
   ]
 }