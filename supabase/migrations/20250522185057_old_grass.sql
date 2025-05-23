/*
  # Mejorar el sistema de aprobación de cartas

  1. Cambios:
    - Añadir función RPC para obtener carta por ID de solicitud
    - Mejorar políticas de seguridad para aprobadores
    - Garantizar que los aprobadores puedan ver las cartas asignadas

  2. Seguridad:
    - Mantener RLS mientras se permite el acceso necesario
    - Validar permisos antes de mostrar datos de cartas
*/

-- Añadir una función RPC para obtener una carta por ID de solicitud
CREATE OR REPLACE FUNCTION get_letter_by_request_id(p_request_id uuid)
RETURNS TABLE (
  letter_id uuid,
  user_id uuid,
  is_approver boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Devolver el ID de la carta, el ID del usuario y si el usuario actual es el aprobador
  RETURN QUERY
  SELECT 
    ar.letter_id,
    l.user_id,
    (ar.assigned_to = auth.uid()) as is_approver
  FROM approval_requests ar
  JOIN letters l ON ar.letter_id = l.id
  WHERE 
    ar.id = p_request_id AND
    (
      ar.assigned_to = auth.uid() OR  -- El usuario es el aprobador
      ar.requested_by = auth.uid() OR -- El usuario es el solicitante
      l.user_id = auth.uid() OR       -- El usuario es el creador de la carta
      EXISTS (                        -- El usuario es un administrador
        SELECT 1 FROM users
        WHERE id = auth.uid() AND role = 'admin'
      )
    );
END;
$$;

-- Añadir una política específica para que los aprobadores puedan ver las cartas que deben aprobar
CREATE POLICY "approvers_can_view_assigned_letters"
ON letters
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM approval_requests
    WHERE 
      letter_id = letters.id AND
      assigned_to = auth.uid()
  )
);

-- Asegurar que los aprobadores puedan acceder a las plantillas de las cartas
CREATE POLICY "approvers_can_view_letter_templates"
ON letter_templates
FOR SELECT
TO authenticated
USING (
  true  -- Todos los usuarios autenticados pueden ver las plantillas
);

-- Actualizar la función de obtener solicitudes de aprobación pendientes para incluir más detalles
CREATE OR REPLACE FUNCTION get_letter_details_for_approval(p_letter_id uuid)
RETURNS TABLE (
  id uuid,
  number integer,
  year integer,
  subject text,
  content jsonb,
  template_id uuid,
  template_name text,
  template_image_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validar que el usuario tenga permiso para acceder a la carta
  IF NOT EXISTS (
    SELECT 1 FROM letters l
    LEFT JOIN approval_requests ar ON l.id = ar.letter_id
    WHERE 
      l.id = p_letter_id AND
      (
        l.user_id = auth.uid() OR                -- Creador
        ar.assigned_to = auth.uid() OR           -- Aprobador
        ar.requested_by = auth.uid() OR          -- Solicitante
        EXISTS (                                 -- Administrador
          SELECT 1 FROM users
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para acceder a esta carta';
  END IF;

  -- Devolver detalles de la carta
  RETURN QUERY
  SELECT 
    l.id,
    l.number,
    l.year,
    l.content->>'subject',
    l.content,
    l.template_id,
    lt.name,
    lt.image_url
  FROM letters l
  LEFT JOIN letter_templates lt ON l.template_id = lt.id
  WHERE l.id = p_letter_id;
END;
$$;