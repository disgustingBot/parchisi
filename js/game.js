const sleep = ms => new Promise(r => setTimeout(r, ms));

console.log("game.js loaded");
// players = ['red', 'yellow'];
// players = ['blue', 'green'];
// players = ['red', 'yellow', 'blue'];
players = ['red', 'green', 'yellow', 'blue'];
colors = {
    'r':{
        'name': 'red',
        'offset': 0,
    },
    'g':{
        'name': 'green',
        'offset': 17,
    },
    'y':{
        'name': 'yellow',
        'offset': 34,
    },
    'b':{
        'name': 'blue',
        'offset': 51,
    },
}


class Color {
    constructor(name, offset) {
        this.name = name;
        this.offset = offset;
    }
}

class Piece {
    constructor(color, id, offset) {
        this.color = color;
        this.id = id;
        this.position = 0;
        this.offset = offset;
        this.number = parseInt(id);
        this.selector = '.' + color + '_piece_' + this.number;
        this.html = document.querySelector(this.selector);
        this.can_move = true;

    }
    move_to(x, y, n) {
        this.position = n;

		this.html.style.top  = x+"px";
        this.html.style.left = y+"px";

        this.hide_selector();
    }
    hide_selector() {
        let selector = this.html.querySelector('.dice_selector')
        selector.classList.remove('active');
    }
    give_selector(options) {
        let selector = this.html.querySelector('.dice_selector')
        if([45, 46, 47].includes((this.position + this.offset) % 68))  {
            selector.classList.add('alt');
        } else {
            selector.classList.remove('alt');
        }
        selector.innerHTML = '';

        options.forEach(option => {
            selector.innerHTML += `<div class="dice_option .dice_option_${option}" data-option="${option}">${option}</div>`;
        });

        selector.style.width = 'calc(' + options.length * 4 + 'vmin + 10px)';
        selector.classList.add('active');
    }
    take_selector() {
        let selector = this.html.querySelector('.dice_selector')
        selector.innerHTML = '';
        selector.classList.remove('active');
    }

}








class Game {
    constructor() {
        // console.log(colors);
        this.turn = 0;
        this.clean_board_visuals();
        document.querySelector('.board').classList.add(players[this.turn].substr(0,3));

        this.dice_html = document.querySelector('.dice_frame');
        this.dice_values = [6, 6];
        this.cost_of_entry = 5;
        this.double_count = 0;
        this.got_double = false;
        this.max_double_count = 3;
        this.subset_sum_result = [];

        this.spots = [];
        [...Array(68).keys()].forEach( id => {this.spots.push(new Spot(id))});
        this.safe_spots = [0, 7, 12, 17, 24, 29, 34, 41, 46, 51, 58, 63];


        this.dice_html.onclick = () => {
            this.roll_dice();
            this.dice_html.classList.add('inactive');
        }


        this.homes = {};
        this.goals = {};
        this.players = {};
        let i = 0;
        this.is_first_turn = true;


        players.forEach( color => {
            this.homes  [color[0]] = new Home(color[0]);
            // this.goals  [color[0]] = new Goal(color[0]);

            let player = {};
            player['color'] = new Color(color, colors[color[0]].offset);
            player['pieces'] = [];
            [...Array(4).keys()].forEach(number => {
                player['pieces'].push(new Piece(color[0], number, colors[color[0]].offset));
            });
            
            player['passes'] = [];
            [...Array(7).keys()].forEach( id => {
                player['passes'].push(new Spot(id, 'pass', color[0]))
            });

            player['goal'] = new Goal(color[0]);
            
            // console.log(player);


            player['pieces'].forEach( piece => {
                this.move_piece_home(piece);

                piece.html.querySelector('.circle').onclick = () => {
                    console.log(piece);

                    let possible_moves = this.get_possible_moves(piece);
                    this.give_selector_to_piece(piece, possible_moves);                    

                };
            });

            this.players[color[0]] = player;

            // console.log('color: ', color, 'offset: ', this.players[color[0]].offset);
            
            i++;
        });

        
        let player_color = players[this.turn][0];
        this.current_player = this.players[player_color];



        // this.move_piece(this.players['g'].pieces[0], 67);
        // this.move_piece(this.players['g'].pieces[1], 66);
        // this.move_piece(this.players['g'].pieces[2], 65);
        // this.move_piece(this.players['g'].pieces[3], 64);
        
        // this.move_piece(this.players['b'].pieces[0], 71);
        // this.move_piece(this.players['b'].pieces[1], 61);
        // this.move_piece(this.players['b'].pieces[2], 62);
        // this.move_piece(this.players['b'].pieces[3], 63);
        
        // this.move_piece(this.players['r'].pieces[0], 54);
        // this.move_piece(this.players['r'].pieces[1], 55);
        // this.move_piece(this.players['r'].pieces[2], 56);
        // this.move_piece(this.players['r'].pieces[3], 72);
        
        // this.move_piece(this.players['y'].pieces[0], 69);
        // this.move_piece(this.players['y'].pieces[1], 67);
        // this.move_piece(this.players['y'].pieces[2], 68);
        // this.move_piece(this.players['y'].pieces[3], 72);
        this.turn_counter = 0;
        this.winner = false;
        this.is_dice_rolled = false;
        this.has_player_moved = false;

        this.play_game();
    }




    async play_game() {
        // while(!this.winner && this.turn_counter<15) {
        while(!this.winner) {
            this.turn_counter++;
            await this.play_turn();
        }
    }



    async play_turn(){
        // console.log('play_turn');

        // -------------- beggining --------------
        this.give_board_visuals()
        await this.dice_roll()
        // this.dice_values = [5, 5]
        // this.got_double = true;
        if (this.got_double) this.act_when_double_is_rolled()

        // ------------ mid turn cycle ------------
        if (this.double_count < this.max_double_count) {
            do{
                // console.log('mid turn cycle')
                this.auto_play()
                if(this.can_player_move()) {
                    await this.player_move()
                }
                this.has_player_won()
            } while( this.can_player_move() )
        }

        // ----------------- end -----------------
        // end of turn
        this.remove_restrictions()
        this.change_turn()
        this.reset_double_count()
        this.clean_board_visuals()
    }
    
    reset_double_count(){
        this.double_count = ((this.double_count == this.max_double_count) || (this.got_double == false)) ? 0 : this.double_count;
    }


    change_turn(){
        let prev_turn = (this.got_double && this.double_count < this.max_double_count) ? (this.turn - 1) % players.length : this.turn;
        this.turn = (prev_turn + 1) % players.length;
        // change current player too
        let player_color = players[this.turn][0];
        this.current_player = this.players[player_color];
    }

    remove_restrictions(){
        this.current_player.pieces.forEach( piece => {piece.can_move = true})
    }
    give_board_visuals(){
        this.dice_html.classList.remove('inactive');
        document.querySelector('.board').classList.add(this.current_player.color.name.substr(0,3));
    }





    async dice_roll(){
        while(this.is_dice_rolled == false) {
            await sleep(100);
        }
        this.is_dice_rolled = false;
        this.dice_html.classList.add('inactive');
    }
    async player_move(){
        while (this.has_player_moved == false) {
            await sleep(100);
        }
        this.has_player_moved = false;
    }
    








    move_piece_home(piece) {
        let xy = this.homes[piece.color].get_xy(piece.id);
        piece.move_to(xy[0], xy[1], -1);
    }
    
    get_possible_moves(piece) {
        if(!piece.can_move){ return [] }
        
        let dices = this.dice_values;
        let possible_moves = [];

        dices.forEach( dice => {
            let offset = this.players[piece.color].color.offset;
            let next_position = this.get_next_position(piece, dice);
            let target_piece = (piece.position + dice < 64) ? this.is_there_a_piece_on_spot(next_position) : false;


            // estos return tendrian que ser "continue"
            if(this.is_there_a_wall_in_the_way(piece, next_position)) { return }

            if (piece.position == -1 && dice != 5) { return }

            if (this.safe_spots.includes(next_position)) {
                if (!!target_piece.length && target_piece[0].color != piece.color) { return }
            }
            if (piece.position + dice > 71) { return }
            
            possible_moves.push(dice);
        });

        return possible_moves;
    }

    is_there_a_wall_in_the_way(piece, end) {
        let start = this.get_next_position(piece, 0);

        for (let i = 1; i <= end - start; i++) {
            let spot = this.get_next_spot(piece, i)
            try {
                if (spot.pieces.length == 2 && start + i < 64) {
                    return true;
                }
            } catch (error) {
                console.log('is_there_a_wall_in_the_way: ', error);
            }
        }
        return false;
    }


    is_there_a_piece_on_spot(spot) { return this.spots[spot].pieces }

    take_selector_from_all_pieces(){
        for (const [color, player] of Object.entries(this.players)) {
            player.pieces.forEach( piece => { piece.take_selector() });
        }
    }

    give_selector_to_piece(piece, options) {
        this.take_selector_from_all_pieces();
        piece.give_selector(options);
        piece.html.querySelectorAll('.dice_option').forEach(option => {
            option.onclick = event => {
                let value = parseInt(option.dataset.option)
                this.move_piece(piece, value);
                piece.html.querySelector('.dice_selector').classList.remove('active');
                this.remove_dice_option(value);
            }
        });
    }
    remove_dice_option(value) {
        const index = this.dice_values.indexOf(value);
        if (index > -1) {
            this.dice_values.splice(index, 1); // 2nd parameter means remove one item only
        }
    }

    roll_dice() {
        let roll_0 = Math.floor(Math.random() * 6) + 1;
        let roll_1 = Math.floor(Math.random() * 6) + 1;

        // if (this.turn_counter == 2) {
        //     roll_0 = 1
        //     roll_1 = 2
        // } else {
        //     roll_0 = 3
        //     roll_1 = 4

        // }

        document.querySelector('.dice_0 p').innerText = roll_0;
        document.querySelector('.dice_1 p').innerText = roll_1;
        
        this.dice_values[0] = roll_0;
        this.dice_values[1] = roll_1;

        this.got_double = (roll_0 == roll_1);
        if (this.got_double) this.double_count++

        this.is_dice_rolled = true;
    }

    act_when_double_is_rolled() {
        if (this.double_count==this.max_double_count) {
            this.kill_best_piece();
        } else {
            this.break_wall();
        }
    }
    kill_best_piece(){
        let player = this.current_player;
        // let best_piece = this.get_best_piece();
        let best_piece = player.pieces.reduce((best, piece) => (best.position > piece.position) ? best : piece);
        this.kill_piece(best_piece);
    }

    break_wall(){
        let player_wall_locations = this.has_current_player_a_wall();
        if(player_wall_locations) {
            let player = this.current_player;
            let max_wall_location = Math.max(...player_wall_locations);
            let walled_pieces = player.pieces.filter(piece => piece.position == max_wall_location);
            walled_pieces[0].can_move = false;
            this.remove_dice_option(this.dice_values[0]);
            this.move_piece(walled_pieces[1], this.dice_values[0]);
            
            console.log('has wall, break walls: ', player_wall_locations);
            console.log('walled pieces: ', walled_pieces);
        }
    }

    has_current_player_a_wall(){
        let player = this.current_player;
        let piece_positions = player.pieces.map( piece => piece.position ).filter( position => position != -1);
        let wall_positions = piece_positions.filter( (pos, index) => piece_positions.indexOf(pos) !== index )

        if (wall_positions.length == 0){ return false }
        return wall_positions;
    }



    auto_play(){
        let moves = this.dice_values
        this.subset_sum_result = [];
        let player = this.current_player;

        let entry_move_convinations = this.subset_sum(moves, this.cost_of_entry);
        entry_move_convinations.forEach( entry_move_convination => {
            let piece_at_home = player.pieces.find( piece => piece.position == -1);
            if (!piece_at_home) { return }
            
            let wall_at_exit = this.is_there_a_wall_in_the_way(piece_at_home, player.color.offset)
            if (!wall_at_exit) {
                entry_move_convination.forEach( dice => { this.remove_dice_option(dice) });
                this.move_piece(piece_at_home, 1);
            }
        });
    }



    /**
     * Recursive approach
     * Time complexity - O(2^n)
     * Space complexity - O(n), take into account additional stack memory and memory for subsets
     */
    subset_sum(numbers, target, partial) {
        let s, n, remaining
    
        partial = partial || []
        s = partial.reduce( (a, b) => a + b, 0)
    
        if (s > target) { return [] }
        
        // check if the partial sum is equals to target
        if (s === target) {
            if(!this.subset_sum_result) this.subset_sum_result = []
            this.subset_sum_result.push(partial)
        }
    
        for (let i = 0; i < numbers.length; i++) {
            n = numbers[i]
            remaining = numbers.slice(i + 1)
            this.subset_sum(remaining, target, partial.concat([n]))
        }
        return this.subset_sum_result
    }
    




    can_player_move(){
        let player = this.current_player;

        for (let i = 0; i < player['pieces'].length; i++) {
            let possible_moves = this.get_possible_moves(player['pieces'][i]);
            if (possible_moves.length != 0) {
                return true
            }
        }
        return false;
    }

    get_next_position(piece, dice) {
        let offset = colors[piece.color].offset;
        return (piece.position + dice < 64) ? (piece.position + dice + offset) % 68 : piece.position + dice;
    }
    get_next_spot(piece, dice) {
        let spot;
        let next_position = this.get_next_position(piece, dice);
        
        if(piece.position + dice < 64) {
            spot = this.spots[next_position];
        } else if (next_position < 71) {
            spot = this.players[piece.color].passes[next_position - 64];
        } else {
            spot = this.players[piece.color].goal;
        }
        return spot;
    }

    async move_piece (piece, dice){
        let offset = colors[piece.color].offset;
        if (0 <= piece.position && piece.position < 64) {
            
            let spot = this.spots[(piece.position + offset) % 68]
            const index = spot.pieces.indexOf(piece);
            if (index > -1) {
                spot.pieces.splice(index, 1); // 2nd parameter means remove one item only
                await sleep(100)
                if (spot.pieces.length == 1) {
                    spot.pieces[0].move_to(spot.get_xy()[0], spot.get_xy()[1], spot.pieces[0].position);
                }
            }
            // this.spots[(piece.position + offset) % 68].piece = null;
        }

        let new_spot;

        let next_position = this.get_next_position(piece, dice);

        let wall = 0;

        if(piece.position + dice < 64) {
            new_spot = this.spots[next_position];
            let target_piece = this.is_there_a_piece_on_spot(next_position)[0];
            if (target_piece) {
                if(target_piece.color != piece.color) {
                    this.kill_piece(new_spot.pieces[0]);
                    this.dice_values.push(20);
                } else {
                    target_piece.move_to(new_spot.get_xy(2)[0], new_spot.get_xy(2)[1], target_piece.position);
                    wall = 1;
                }
            }
        } else if (next_position < 71) {
            new_spot = this.players[piece.color].passes[next_position - 64];
        } else {
            new_spot = this.players[piece.color].goal;
            this.dice_values.push(10);
        }



        new_spot.pieces.push(piece);

        piece.move_to(new_spot.get_xy(wall)[0], new_spot.get_xy(wall)[1], piece.position + dice);
        this.has_player_moved = true;
    }
    
    kill_piece(piece){
        let offset = colors[piece.color].offset;
        let spot = this.spots[(piece.position + offset) % 68]
        const index = spot.pieces.indexOf(piece);
        spot.pieces.splice(index, 1); // 2nd parameter means remove one item only
        this.move_piece_home(piece);
    }

    has_player_won(){
        let player = this.current_player;
        let pieces_at_goal = player.pieces.filter( piece => (piece.position == 71));
        if (pieces_at_goal.length == 4) {
            document.querySelector('.message_background').classList.add('active');
            document.querySelector('.message_title').innerHTML = `${player.color.name} WINS!`;
            this.winner = this.current_player.color.name;
        }
    }

    clean_board_visuals(){
        document.querySelector('.board').classList.remove('blu');
        document.querySelector('.board').classList.remove('yel');
        document.querySelector('.board').classList.remove('gre');
        document.querySelector('.board').classList.remove('red');
    }

}






















class Spot {
    constructor(id, type = 'normal', color = 'w') {
        this.id = id;
        // console.log("id: " + id);
        this.number = parseInt(id);
        if (type != 'pass') {
            this.number = ( id <=9 ) ? '0' + this.number : this.number;
        }
        this.pieces = [];
        this.selector = (type != 'pass') ? '.spot_' + this.number : '.' + color + '_pas' + this.number;
        
        this.html = document.querySelector(this.selector);
        
        this.html.onclick =_=>{ console.log(this) }
    }
    get_xy(id = 0) {
        let offset_x = 0;
        let offset_y = 0;
        let n = this.number;

        if(id!=0){
            if ((n > 3 && n < 21) || (n > 37 && n < 55)) {
                offset_x = (id == 1) ? this.html.offsetWidth/4 : -this.html.offsetWidth/4;
            } else {
                offset_y = (id == 1) ? this.html.offsetHeight/4 : -this.html.offsetHeight/4;
            }
        }
        // console.log(offset);
            
        // return center position of spot
        // let x = this.html.offsetTop + this.html.offsetHeight/2;
        let y = this.html.offsetTop + this.html.offsetHeight/2 + offset_y;
        let x = this.html.offsetLeft + this.html.offsetWidth/2 + offset_x;
        // console.log('x, y: ', x, y);
        return [y, x];
    }
}
class Home {
    constructor(color) {
        this.color = color;
        this.number = 0;
            
        this.selector = '.'+color+'_home';
        this.html = document.querySelector(this.selector);
    }
    get_xy(id) {
        // return center position of spot
        let offset_x = 40;
        let offset_y = 40;
        switch (id) {
            case 1:
                offset_x = -offset_x;
                break;
            case 2:
                offset_x = -offset_x;
                offset_y = -offset_y;
                break;
            case 3:
                offset_y = -offset_y;
                break;
        
            default:
                break;
        }
        let x = this.html.offsetTop + this.html.offsetHeight/2 + offset_x;
        let y = this.html.offsetLeft + this.html.offsetWidth/2 + offset_y;
        return [x, y];
    }
}
class Goal {
    constructor(color) {
        this.color = color;
            
        this.selector = '.'+color+'_love';
        this.html = document.querySelector(this.selector);
        this.pieces = [];
    }
    get_xy() {
        // return center position of spot
        let x = this.html.offsetTop + this.html.offsetHeight/2;
        let y = this.html.offsetLeft + this.html.offsetWidth/2;
        return [x, y];
    }
}





let game = new Game();




