import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export const writeGame = async (game) => {
    console.log(game)
    const { data, error } = await supabase
        .from('igdb_games')
        .upsert([
        {
            igdb_id: game.igdbID,
            steam_id: game.steamID,
            name: game.name,
            release_date: game.metadata.release_date,
            developer: game.metadata.developer,
            header_img: game.metadata.header_img,
            cover: game.metadata.cover,
            screenshots: game.metadata.screenshots,
            summary: game.metadata.summary,
            storyline: game.metadata.storyline,
            genre: game.metadata.genre,
            publisher: game.metadata.publisher,
        },
        ])
        if (error) console.log(error)
}
