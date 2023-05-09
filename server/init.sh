rm ./data/data.db
echo -e ".separator ','\nCREATE TABLE places(IDPl INT NOT NULL PRIMARY KEY, 'Sorting form' TEXT, 'Caption form' TEXT, note TEXT, coordinates TEXT, category TEXT);\n.mode csv\n\n.header on\n.import --skip 1 ./data/source.csv places\n
ALTER TABLE places RENAME COLUMN \"idpl\" TO \"id\";
ALTER TABLE places RENAME COLUMN \"Sorting form\" TO \"form\";
ALTER TABLE places RENAME COLUMN \"Caption form\" TO \"caption\";
ALTER TABLE places ADD osm TEXT;
ALTER TABLE places ADD wiki TEXT;
ALTER TABLE places ADD lon REAL;
ALTER TABLE places ADD lat REAL;
ALTER TABLE places ADD resolved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE places ADD status INTEGER NOT NULL DEFAULT 0;
ALTER TABLE places ADD name TEXT;
ALTER TABLE places ADD qty INTEGER NOT NULL DEFAULT 0;
" | sqlite3 ./data/data.db > /dev/null 2>&1 &
