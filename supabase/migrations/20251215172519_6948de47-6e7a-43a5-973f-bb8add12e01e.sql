UPDATE role_permissions 
SET can_view = true, can_create = true, can_edit = true 
WHERE role = 'manager' AND module = 'depenses';