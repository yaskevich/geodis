# Geodis
### Tool for geocoding place names and disambiguating (resolving) the variants

*Current status: working prototype*

For geospatial analysis or for digital cartography one needs the data containing one-to-one relation between a place and coordinates pair. However, geocoding &ndash; **retrieving the coordinates for a place name** &ndash; via some external API usually results in a response with more than one entity related to the same name.

The application 

- takes CSV file with the list of place names to geocode
- queries OpenStreetMap data (both via Nominatim and direct access to OSM API)
- stores received data in SQLite database file
- provides user interface for manual selection of a proper variant and visualizes the data on a map
- outputs the results in machine-readable format (CSV and JSON)
