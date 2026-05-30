CREATE TABLE IF NOT EXISTS validation\_rules (

&#x20; id uuid PRIMARY KEY DEFAULT gen\_random\_uuid(),



&#x20; credit\_id uuid NOT NULL,

&#x20; submittal\_id uuid NOT NULL,



&#x20; rule\_type text NOT NULL, 

&#x20; -- 'MANDATORY\_DOCUMENT'

&#x20; -- 'MIN\_DOCUMENT\_COUNT'

&#x20; -- 'DOCUMENT\_TYPE\_REQUIRED'



&#x20; expected\_value jsonb, 

&#x20; -- example:

&#x20; -- {"document\_type": "DRAWING"}

&#x20; -- {"min\_count": 2}



&#x20; error\_message text,



&#x20; created\_at timestamptz DEFAULT now()

);

