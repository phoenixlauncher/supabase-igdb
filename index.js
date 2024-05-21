import { writeGame } from "./supabase.js";

let updateQueue = [];

class Game {
    constructor(name, steamID, igdbID, release_date, developer, header_img, cover, screenshots, summary, storyline, genre, publisher, icon) {
        this.name = name;
        this.steamID = steamID;
        this.igdbID = igdbID;
        this.metadata = {
            release_date: release_date,
            developer: developer,
            header_img: header_img,
            cover: cover,
            screenshots: screenshots,
            genre: genre,
            publisher: publisher,
            summary: summary,
            storyline: storyline,
        };
        this.icon = icon;
    }
}

const print = (data) => {
    console.log(data)
}

function getSteamID(url) {
    return String(url).replace(/^https?:\/\//, '').split('/')[2];
}
function getSteamHeader(steamID) {
    return `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamID}/library_hero.jpg`
}

// Function to process the update queue
const processUpdateQueue = async () => {
    while (updateQueue.length > 0) {
        const game = updateQueue.shift();
        print("game going in with id: " + game.igdbID)
        await writeGame(game);
    }
};

function fetchGames(requestNum, limit) {
    fetch(
        "https://api.igdb.com/v4/games",
        {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Client-ID': process.env.IGDB_CLIENT_ID,
                'Authorization': 'Bearer ' + process.env.IGDB_ACCESS_TOKEN
            },
            body: `
            fields
            name,
            artworks,
            artworks.width,
            artworks.image_id,
            cover,
            cover.image_id,
            screenshots,
            screenshots.width,
            screenshots.image_id,
            storyline,
            summary,
            genres.name,
            themes.name,
            involved_companies.company.name,
            involved_companies.publisher,
            involved_companies.developer,
            first_release_date,
            websites,
            websites.url,
            websites.category;
            limit ${limit};
            sort id asc;
            offset ${requestNum * limit};
            `
        })
        .then(response => response.json()) // Parse the JSON response
        .then(data => {
            if (data.length == 0) {
                console.log("we done")
                return
            }
            data.forEach(igdbGame => {
                let game = new Game("", "", "", "", "", "", "", [], "", "", "")

                //save name
                game.name = igdbGame.name
                print(igdbGame.name)
                game.igdbID = igdbGame.id

                //save steam id and steam header
                if (igdbGame.websites) {
                    igdbGame.websites.forEach(website => {
                        if (website.category == 13) {
                            game.steamID = getSteamID(website.url)
                            game.metadata.header_img = getSteamHeader(game.steamID)
                        }
                    })
                }

                //save igdb header
                if (!game.metadata.header_img) {
                    if (igdbGame.artworks) {
                        let greatestWidth = 0
                        igdbGame.artworks.forEach(artwork => {
                            if (artwork.width > greatestWidth) {
                                greatestWidth = artwork.width
                                game.metadata.header_img = `https://images.igdb.com/igdb/image/upload/t_1080p_2x/${artwork.image_id}.jpg`
                            }
                        })
                    }
                }

                //save igdb header
                if (!game.metadata.header_img) {
                    if (igdbGame.screenshots) {
                        let greatestWidth = 0
                        igdbGame.screenshots.forEach(screenshot => {
                            if (screenshot.width > greatestWidth) {
                                greatestWidth = screenshot.width
                                game.metadata.header_img = `https://images.igdb.com/igdb/image/upload/t_1080p_2x/${screenshot.image_id}.jpg`
                            }
                        })
                    }
                }

                if (igdbGame.screenshots) {
                    igdbGame.screenshots.forEach(screenshot => {
                        game.metadata.screenshots.push(`https://images.igdb.com/igdb/image/upload/t_screenshot_med_2x/${screenshot.image_id}.jpg`)
                    })
                }

                //save cover
                if (igdbGame.cover) {
                    game.metadata.cover = `https://images.igdb.com/igdb/image/upload/t_cover_big/${igdbGame.cover.image_id}.jpg`
                }

                //save release date
                game.metadata.release_date = igdbGame.first_release_date

                //save developer(s) & publisher(s)
                let developers = []
                let publishers = []
                if (igdbGame.involved_companies) {
                    igdbGame.involved_companies.forEach(company => {
                        const companyName = company.company.name
                        if (company.developer && developers.length < 2) {
                            developers.push(companyName)
                        }
                        if (company.publisher && publishers.length < 2) {
                            publishers.push(companyName)
                        }
                    })
                }
                game.metadata.developer = developers.join(", ")
                game.metadata.publisher = publishers.join(", ")

                game.metadata.summary = igdbGame.summary
                game.metadata.storyline = igdbGame.storyline

                //save genre(s)
                let uniqueGenres = []
                let combinedCount = 0
                if (igdbGame.genres) {
                    igdbGame.genres.forEach(genre => {
                        if (genre.name != "" && combinedCount < 3) {
                            if (genre.name.toLowerCase() == "Science Fiction".toLowerCase()) {
                                uniqueGenres.push("Sci-fi")
                            } else {
                                uniqueGenres.push(genre.name)
                            }
                            combinedCount += 1
                        }
                    })
                }
                if (igdbGame.themes) {
                    igdbGame.themes.forEach(theme => {
                        if (!theme.name && combinedCount < 3) {
                            if (theme.name.toLowerCase() == "Science Fiction".toLowerCase()) {
                                uniqueGenres.push("Sci-fi")
                            } else {
                                uniqueGenres.push(theme.name)
                                combinedCount += 1
                            }
                        }
                    })
                }
                let combinedGenresString = uniqueGenres.sort().join(", ")
                game.metadata.genre = combinedGenresString

                updateQueue.push(game);
            });
            processUpdateQueue();
        })
        .catch(err => {
            console.error(err);
        }
    );
}


let num = 0
let delay = 3000

async function fetchGamesLoop() {
    fetchGames(num, 500)
    num += 1
    setTimeout(fetchGamesLoop, delay)
}

fetchGamesLoop();
