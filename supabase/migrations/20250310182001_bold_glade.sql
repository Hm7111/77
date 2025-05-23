/*
  # Add letter numbering system

  1. New Functions
    - `get_next_letter_number()`: Generates the next letter number for the year
    
  2. New Columns
    - Add `number` column to letters table
    - Add `year` column to letters table
    
  3. Triggers
    - Add trigger to automatically set letter number and year on insert
*/

-- Add new columns to letters table
ALTER TABLE letters 
ADD COLUMN number integer,
ADD COLUMN year integer;

-- Create function to get next letter number
CREATE OR REPLACE FUNCTION get_next_letter_number(p_year integer)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_number integer;
BEGIN
  -- Get the highest number for the given year
  SELECT COALESCE(MAX(number), 0) + 1
  INTO v_next_number
  FROM letters
  WHERE year = p_year;
  
  RETURN v_next_number;
END;
$$;

-- Create trigger function
CREATE OR REPLACE FUNCTION set_letter_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set the year
  NEW.year := EXTRACT(YEAR FROM CURRENT_TIMESTAMP);
  
  -- Get and set the next number
  NEW.number := get_next_letter_number(NEW.year);
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER tr_set_letter_number
BEFORE INSERT ON letters
FOR EACH ROW
EXECUTE FUNCTION set_letter_number();