from bs4 import BeautifulSoup

# thank you https://www.chessgames.com/chessecohelp.html

# read the eco listing and export as a readable json file
def parse_eco_listing(file_path):
    with open(file_path, 'r') as f:
        soup = BeautifulSoup(f, 'html.parser')

    eco_data = []
    for row in soup.find_all('tr'):
        cells = row.find_all('td')
        if len(cells) >= 2:
            code = cells[0].get_text(strip=True)
            # name are under <B> tag, sequences are under <font> tag
            name = cells[1].find('b').get_text(strip=True)
            move_sequences = cells[1].find('font').get_text(strip=True) if cells[1].find('font') else None
            move_sequences = move_sequences.replace(name, '') if move_sequences else None

            eco_data.append({'code': code, 'name': name, 'move_sequences': move_sequences})

    return eco_data

if __name__ == "__main__":
    eco_data = parse_eco_listing('eco_listing.html')
    with open('eco_data.json', 'w') as f:
        import json
        json.dump(eco_data, f, indent=2)