
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json(); // Parse JSON data
        return data; // Return the processed data
    } catch (error) {
        console.error("Error fetching data:", error);
        throw error; // Rethrow the error for the caller to handle
    }
}

let game_id = "0"
let move_count = 0
let board = null;
let move_history = []
let game = null
let ai_hint = false
let komi = 6.5

document.addEventListener('DOMContentLoaded', () => {
    companionToggleButton.addEventListener('click', handleCompanionToggle);

    const tabs = document.querySelectorAll('[data-tab]');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            // Hide all content and remove active state from tabs
            contents.forEach(content => content.classList.add('hidden'));
            tabs.forEach(t => t.classList.remove('border-b-4', 'border-badukAccent'));

            // Show selected content and highlight tab
            document.getElementById(targetTab).classList.remove('hidden');
            tab.classList.add('border-b-4', 'border-badukAccent');
            window.dispatchEvent(new Event('resize'));
            document.getElementById('profile-rank').innerHTML = localStorage.getItem('local_rank') || "Error" // set rank to last rank used  
            document.querySelectorAll(".wgo-tsumego-control").forEach((element) => {
                element.style.display = "none"; // Properly hides the elements
            });
            if (targetTab === "play") {
                const startGameButton = document.getElementById('startGame');

                // Check if the button exists and trigger the click event
                if (startGameButton) {
                    const clickEvent = new Event('click', { bubbles: true, cancelable: true });
                    startGameButton.dispatchEvent(clickEvent);
                }
                const testDiv = document.getElementById("boardContainer");
                testDiv.scrollIntoView({
                    behavior: "auto",
                    block: "center",
                    inline: "center",
                });


            }

            if (targetTab === "learn") {
                document.querySelector("#learninfo").innerHTML = "";
                document.querySelector("#learnboard").innerHTML = "";
                updateLessonsVisibility();
            }

            if (targetTab === "puzzle") {
                const testDiv = document.getElementById("tsumego_wrapper");
                testDiv.scrollIntoView({
                    behavior: "auto",
                    block: "center",
                    inline: "center",
                });
            }

            if (targetTab === "profile") {
                document.getElementById('profile-rank').textContent = getDisplayRank()
                document.getElementById('profile-level').textContent = getLevel()
                document.getElementById('profile-games-played').textContent = getGamesPlayed();
                document.getElementById('profile-wins').textContent = getPlayerWins();
                document.getElementById('profile-puzzles-done').textContent = getPuzzlesDone();
                document.getElementById('profile-puzzles-correct').textContent = getPuzzlesCorrect();
                document.getElementById('profile-currency').textContent = getCurrency();
                renderInventory();
            }

            if (targetTab === "shop") {
                initshop();
            }

        });
    });

    const selectors = document.getElementById('selectors');
    const wgoBoardDiv = document.getElementById('wgoBoard');
    const startGameButton = document.getElementById('startGame');
    const newGameButton = document.getElementById('newGame');
    const endGameButton = document.getElementById('endGame');
    const boardContainer = document.getElementById('boardContainer');

    let boardsize = parseInt(document.getElementById('boardSize').value, 10);
    const rankSelector = document.getElementById('rankSelector')
    const has_ai_hint = true;

    document.getElementById('boardSize').addEventListener("change", () => {
        rankSelector.classList.remove('hidden');
    })
    rankSelector.addEventListener("change", () => {
        startGameButton.classList.remove('hidden');
    })

    // Start Game
    startGameButton.addEventListener('click', async () => {
        rungame()
    })
    rungame()

    async function rungame() {
        document.getElementById("rankspan").innerHTML = getDisplayRank()
        boardsize = parseInt(document.getElementById('boardSize').value, 10)
        let rank = document.getElementById('playerRank').value
        rank = getRank()
        komi = 6.5
        if (Number.isNaN(boardsize)) {
            console.log("Auto game started...")

            // 7x7
            const beginner = convertKyuDanToLevel("35k")
            // 9x9
            const intermediate = convertKyuDanToLevel("20k")
            // 13x13
            const advanced = convertKyuDanToLevel("14k")
            // 19x19

            // spread
            const rndSpread = 2;
            let playerlevel = convertKyuDanToLevel(getRank()) + getRandomInt(-rndSpread, rndSpread);

            // add a bit of randomness to the player level

            if (playerlevel < beginner) {
                boardsize = 7
                komi = 0.5
            } else if (playerlevel < intermediate) {
                boardsize = 9
            } else if (playerlevel < advanced) {
                boardsize = 13
            } else {
                boardsize = 19
            }
            playerlevel = convertKyuDanToLevel(getRank())

        }

        // shift + alt + f
        console.log("New Game")

        // clamp rank
        const MAXRANK = "10d"
        if (convertKyuDanToLevel(getRank()) > convertKyuDanToLevel(MAXRANK)) {
            rank = MAXRANK
        }

        move_count = 0
        move_history = []

        // Hide selectors and show WGo.js board
        selectors.classList.add('hidden');
        wgoBoardDiv.classList.remove('hidden');
        // Initialize WGo.js Board
        boardContainer.innerHTML = "";
        board = new WGo.Board(boardContainer, {
            size: boardsize, // Board size (e.g., 19 for standard)
            width: Math.min(window.innerWidth * 0.8, 600), // Responsive width
            height: Math.min(window.innerHeight * 0.8, 600), // Responsive height
        });

        endGameButton.classList.add('hidden');

        // Dynamically set board size to fit most of the screen
        function resizeBoard() {
            const boardSize = Math.min(window.innerWidth, window.innerHeight) * 0.7; // 80% of the smaller dimension
            board.setDimensions(boardSize, boardSize); // Adjust the board dimensions
        }

        // Attach resize listener to update the board on window resize
        window.addEventListener("resize", resizeBoard);

        // Set initial size
        resizeBoard();
        game = new WGo.Game(boardsize, "KO"); // Manages game state and rules
        let game_type = "normal"
        let handicap_stones = 0

        if (getRandomInt(1, 10) === 2) {
            game_type = "chinese" // 10% chance of playing chinese gamemode
        }

        if (game_type === 'normal') {
            if (getRandomInt(1, 5) === 2 && getLevel() > 10 && boardsize >= 13) {
                game_type = "handicap" // 25% chance of playing handicap game
                handicap_stones = getRandomInt(2, 5);
                komi = 0.5
            }
        }
        console.log(`Game type: ${properCase(game_type)}`)
        if (game_type !== "normal") {
            if (getLevel() < 5 || boardsize < 13 || convertKyuDanToLevel(getRank()) < convertKyuDanToLevel("25k")) {
                game_type = "normal" // make all games lower than level 5 normal
                console.log("Clamped to normal game")
            }
        }

        //showToast(`Game type: ${properCase(game_type)}`)

        // Place handicap stones for black (WGo.B)
        if (game_type === "handicap") {
            const starDistance = boardsize >= 13 ? 3 : 2; // 4th line for boards >= 13x13, 3rd line for smaller boards

            // Define star points in the traditional handicap placement order
            const starPoints = [
                { x: starDistance, y: starDistance }, // Top left
                { x: boardsize - starDistance - 1, y: boardsize - starDistance - 1 }, // Bottom right
                { x: boardsize - starDistance - 1, y: starDistance }, // Top right
                { x: starDistance, y: boardsize - starDistance - 1 }, // Bottom left
                { x: Math.floor(boardsize / 2), y: Math.floor(boardsize / 2) }, // Center
            ];

            // Ensure handicap_stones does not exceed 5
            const stonesToPlace = Math.min(handicap_stones, 5);

            // Place the required number of handicap stones
            for (let i = 0; i < stonesToPlace; i++) {
                const point = starPoints[i];

                // Place the stone in the game logic
                game.play(point.x, point.y, WGo.B);
                move_history.push({ x: point.x, y: point.y, c: WGo.B })

                // Display the stone on the board
                board.addObject({
                    x: point.x,
                    y: point.y,
                    c: WGo.B,
                });
            }

            // Redraw the board to ensure all objects are displayed
            board.redraw();
        }

        // Place alternating black (B) and white (W) stones on opposite corners
        if (game_type === "chinese") {
            const starDistance = boardsize >= 13 ? 3 : 2; // 4th line for boards >= 13x13, 3rd line for smaller boards

            // Define star points
            const starPoints = [
                { x: starDistance, y: starDistance, color: WGo.B }, // Top left, black
                { x: boardsize - starDistance - 1, y: starDistance, color: WGo.W }, // Top right, white
                { x: starDistance, y: boardsize - starDistance - 1, color: WGo.W }, // Bottom left, white
                { x: boardsize - starDistance - 1, y: boardsize - starDistance - 1, color: WGo.B }, // Bottom right, black
            ];

            // Add stones to the game logic and display them on the board
            for (const point of starPoints) {
                // Place the stone in the game logic
                game.play(point.x, point.y, point.color);
                move_history.push({ x: point.x, y: point.y, c: point.color })
                // Display the stone on the board
                board.addObject({
                    x: point.x,
                    y: point.y,
                    c: point.color,
                });
            }

            // Redraw the board to ensure all objects are displayed
            board.redraw();
        }

        // end of settings gametype

        let requested_rank = getRank()
        let requested_komi = 6.5
        if (game_type === "handicap") {
            requested_komi = 0.5
            requested_rank = convertLevelToKyuDan(convertKyuDanToLevel(getRank()) + handicap_stones)
        }

        if (convertKyuDanToLevel(getRank()) < convertKyuDanToLevel("30k")) {
            requested_komi = 0.5
        }

        let companion_key = 38; // default for 20k
        console.log(getCompanion())
        const companion_display = document.getElementById("companion");
        if (getCompanion() == null) {
            console.log("No Companion")
            document.getElementById("companion-moves").classList.add("hidden")
            companion_display.innerHTML = ""
            companion_display.classList.add("hidden")
            game_id = await fetchData(`/create-game?boardsize=${boardsize}&rank=${requested_rank}&type=${game_type}&handicap=${handicap_stones}&komi=${requested_komi}&companion_key=${companion_key}`);
        } else {
            document.getElementById("companion-moves").classList.remove("hidden")
            console.log("Companion")
            companion_key = getCompanion().ai_key
            companion_display.innerHTML = `<img src="${getCompanion().image}" class="w-2/10 max-w-[20%] h-auto"><br><h3>Companion: </h3>${getCompanion().title}`
            companion_display.classList.remove("hidden")
            game_id = await fetchData(`/create-game?boardsize=${boardsize}&rank=${requested_rank}&type=${game_type}&handicap=${handicap_stones}&komi=${requested_komi}&companion_key=${companion_key}`);
        }

        game_id = game_id.gameId
        console.log(game_id);

        if (game_type === "handicap") {
            move_count++;
            await handleAIMove('pass', board);
        }
        // Fetch and play AI move
        ai_hint = false;
        move_count = 0
        move_history = []




        // Restrict to one color (e.g., black)
        const stoneColor = WGo.B; // WGo.B for Black, WGo.W for White

        // Add a click event listener to place a stone// Board click event listener for player's move
        board.addEventListener("click", async (x, y) => {
            if (!game.isOnBoard(x, y)) return; // Ignore invalid clicks

            // Check if it's the player's turn
            const isBlackTurn = move_count % 2 === 0;
            if ((stoneColor === WGo.B && !isBlackTurn) || (stoneColor === WGo.W && isBlackTurn)) {
                return; // Not the player's turn
            }

            // Play the move and validate using WGo.Game
            game.repeating = "NONE"
            const result = game.play(x, y, stoneColor); // Validates and checks captures
            game.repeating = "KO"
            if (result === 1 || result === 2 || result === 3 || result === 4) {
                console.log("Invalid move:", result); // 1 = Out of bounds, 2 = Occupied, 3 = Suicide
                return;
            }
            move_history.push({ x: x, y: y, c: stoneColor })
            // Add the player's stone to the board
            board.addObject({ x: x, y: y, c: stoneColor });
            addMarker(x, y, board, stoneColor); // Update the marker for the player's move

            // Remove captured stones
            result.forEach(captured => board.removeObjectsAt(captured.x, captured.y));

            // Convert move to Go notation (e.g., "D4")
            const playerMove = convertToCoords(x, y);
            console.log(`Player (${stoneColor === WGo.B ? "Black" : "White"}) move: ${playerMove}`);

            move_count++; // Switch turns
            document.querySelector("#movecountspan").textContent = move_count


            if (move_count > boardsize * boardsize / 3) {
                endGameButton.classList.remove('hidden');
            }
            let error_flag = false
            const result_gamestate = restore_gamestate(game, move_history)
            error_flag = result_gamestate[1]
            game = result_gamestate[0]

            if (error_flag) {
                console.log("Error")
                move_count--;
                move_history.pop()
                restore_gamestate(game, move_history)
                clearBoardMarkers(board, game)
                showToast("Cannot play - KO RULE!")
                return; // exit if invalid move
            }
            clearBoardMarkers(board, game)

            ai_hint = await handleAIMove(playerMove, board);

            if (has_ai_hint && companionToggleButton.classList.contains('bg-blue-500')) {
                show_ai_hints(game, board, ai_hint)
            }

        });

        // Function to handle AI's move
        async function handleAIMove(playerMove, board) {
            try {
                // sleep
                //await new Promise(resolve => setTimeout(resolve, 2000));

                const AI_COLOR = WGo.W

                // Fetch AI move, passing player's move as a parameter
                const response = await fetchData(`/move?id=${game_id}&move=${playerMove}`);
                console.log(response)
                const score = response.aiScore[0]
                const ai_move = response.aiResponse; // Example: "D4"
                const ai_hint = String(response.hint);
                const top_moves = getTopMoves(ai_hint)
                console.log(top_moves)
                console.log(`AI move: ${ai_move}`);
                if (ai_move === 'pass') {
                    showToast("AI passed!")
                    move_count++; // Switch turns
                    game.pass()
                    document.querySelector("#movecountspan").textContent = move_count
                    document.querySelector("#scorespan").textContent = score
                    return;
                }

                // Convert AI move to coordinates
                const ai_x = ai_move[0].charCodeAt(0) - "A".charCodeAt(0) - (ai_move[0] >= "J" ? 1 : 0);
                const ai_y = parseInt(ai_move.slice(1)) - 1;

                // Play AI's move using WGo.Game
                const result = game.play(ai_x, ai_y, AI_COLOR); // AI is White
                if (Array.isArray(result)) {
                    // Add AI's stone to the board
                    board.addObject({ x: ai_x, y: ai_y, c: AI_COLOR });

                    move_history.push({ x: ai_x, y: ai_y, c: AI_COLOR })
                    // Remove captured stones
                    result.forEach(captured => board.removeObjectsAt(captured.x, captured.y));
                    addMarker(ai_x, ai_y, board, AI_COLOR); // Update the marker for the AI's move
                    console.log(`AI placed: ${ai_move}`);
                    move_count++; // Switch turns
                    document.querySelector("#movecountspan").textContent = move_count
                    document.querySelector("#scorespan").textContent = score
                    return top_moves
                } else {
                    console.error("AI made an invalid move:", result);
                }
            } catch (error) {
                console.error("Error fetching AI move:", error);
            }
        }

        // Helper function to convert coordinates to Go format (e.g., D4)
        function convertToCoords(x, y) {
            const letters = "ABCDEFGHJKLMNOPQRSTUVWXYZ"; // Skips 'I'
            return `${letters[x]}${y + 1}`;
        }

    };

    // New Game
    newGameButton.addEventListener('click', () => {
        wgoBoardDiv.classList.add('hidden');
        selectors.classList.remove('hidden');
        document.getElementById('playerRank').value = ""
        document.getElementById('boardSize').selectedIndex = 0
        startGameButton.classList.add('hidden');
        rankSelector.classList.add('hidden');
    });
    endGameButton.addEventListener('click', async () => {
        incrementGamesPlayed();
        game_id = "0"
        const score = document.querySelector("#scorespan").textContent
        if (score[0] === "B" && move_count !== 0) {
            showToast("You won!")
            incrementPlayerWins();
            adjustRank(1) // increase rank by 1 on win
            incrementExperience(Math.floor(move_count / 2))
            adjustCurrency(5)
        } else if (move_count !== 0) {
            incrementExperience(Math.floor(move_count / 4))
            showToast("You lost!")
            setHasLost(true);
            adjustCurrency(2)
            adjustRank(-1) // decrease rank by 1 on loss
            if (convertKyuDanToLevel(getRank()) <= convertKyuDanToLevel("15k")) {
                adjustRank(-1)
            }
        }

        document.getElementById("rankspan").innerHTML = getDisplayRank()
        document.getElementById("movecountspan").innerHTML = "..."
        move_count = 0
        document.querySelector('[data-tab="play"]').click();

    })

    // Update lessons visibility based on rank
    function updateLessonsVisibility() {
        const currentRank = getRank();
        const currentElo = convertKyuDanToLevel(currentRank);

        const currentLevel = getLevel()

        document.querySelectorAll('.lesson-item').forEach(lesson => {
            const lessonRank = lesson.getAttribute('data-rank');
            const lessonElo = convertKyuDanToLevel(lessonRank);
            const lessonLevel = parseInt(lesson.getAttribute('data-level'));

            console.log(`Lesson Rank: ${lessonRank}, Level: ${lessonElo}`);

            // Show the lesson if current rank level is greater than or equal to the lesson's required level
            if (currentElo >= lessonElo && currentLevel >= lessonLevel) {
                console.log(`Unlocking lesson: ${lessonRank}`);
                lesson.classList.remove('hidden');
            } else {
                console.log(`Locking lesson: ${lessonRank}`);
                lesson.classList.add('hidden');
            }
        });
    }

    // Add click event listeners to lesson titles for toggling content
    document.querySelectorAll('.lesson-title').forEach(title => {
        title.addEventListener('click', () => {
            // Hide all other lesson contents
            document.querySelectorAll('.lesson-content').forEach(content => {
                if (content !== title.nextElementSibling) {
                    content.classList.add('hidden');
                }
            });

            // Toggle the visibility of the current content
            const content = title.nextElementSibling;
            content.classList.toggle('hidden');
        });
    });


    // Call the function to update lessons visibility
    updateLessonsVisibility();
    // end init learn tab



    const testDiv = document.getElementById("boardContainer");
    testDiv.scrollIntoView({
        behavior: "auto",
        block: "center",
        inline: "center",
    });
    // Helper function to convert coordinates to SGF format
    function toSgfCoordinates(x, y) {
        const letters = "abcdefghijklmnopqrstuvwxyz";
        return letters[x] + letters[y];
    }

    // Generate SGF string
    function generateSgf(move_history, boardsize, komi) {
        let sgf = `(;
FF[4]GM[1]SZ[${boardsize}]KM[${komi}]\n`; // SGF header with board size and komi

        // Add moves to SGF
        move_history.forEach(move => {
            const color = move.c === WGo.B ? "B" : "W"; // Map WGo.B and WGo.W to "B" or "W"
            const coords = toSgfCoordinates(move.x, move.y);
            sgf += `;${color}[${coords}]`;
        });

        sgf += "\n)"; // Close SGF file
        return sgf;
    }

    // Function to save SGF
    function saveSgf() {
        const sgf = generateSgf(move_history, boardsize, komi);

        // Create a Blob for the SGF content
        const blob = new Blob([sgf], { type: "application/x-go-sgf" });
        const url = URL.createObjectURL(blob);

        // Create a temporary link to download the SGF file
        const a = document.createElement("a");
        a.href = url;
        a.download = "game.sgf";
        a.style.display = "none"; // Hide the link
        document.body.appendChild(a);

        // Trigger the download
        a.click();

        // Clean up
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    // Attach click event to the button
    document.getElementById("save-sgf-button").addEventListener("click", saveSgf);

});


let lastMarkerPosition = null; // To store the position of the last marker

function addMarker(x, y, board, color) {
    // Remove the previous marker if it exists
    if (lastMarkerPosition) {
        board.removeObject({
            x: lastMarkerPosition.x,
            y: lastMarkerPosition.y,
            type: "CR" // Specify the marker type to avoid removing stones
        });
    }

    if (color === WGo.W) {
        // Add a new marker at the given coordinates
        board.addObject({
            x: x,
            y: y,
            type: "CR", // Circle marker
            c: "rgba(0, 0, 0, 0.6)", // Optional: Customize the marker color (semi-transparent blue)
        });
    }
    if (color === WGo.B) {
        // Add a new marker at the given coordinates
        board.addObject({
            x: x,
            y: y,
            type: "CR", // Circle marker
            c: "rgba(255, 255, 255, 0.6)", // Optional: Customize the marker color (semi-transparent blue)
        });
    }

    // Update the last marker position
    lastMarkerPosition = { x: x, y: y };
}
function clearBoardMarkers(board, game) {

    // Clear the board
    board.removeAllObjects();

    // Get the current position from the game object
    const position = game.getPosition();
    const size = position.size;

    // Iterate through the entire board to place stones
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            const color = position.get(x, y);
            if (color) {
                // Place stones on the board
                board.addObject({ x: x, y: y, c: color });
            }
        }
    }

    // Redraw the board to reflect the final state
    board.redraw();

    // Return the game object for further use if needed
    return game;
}



function updateAtariMarkers(game, board) {
    const position = game.getPosition();
    const size = position.size;
    const capturedPositions = []; // Array to store captured positions

    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            if (position.get(x, y) === 0) {
                // Save the current board state
                const savedState = game.getPosition().clone();
                if (!savedState.capCount) {
                    // Initialize capCount if not present
                    savedState.capCount = { black: 0, white: 0 };
                }

                // Simulate placing a white stone
                const captured = game.play(x, y, WGo.W);
                if (captured && captured.length > 0) {
                    // Store the captured positions
                    captured.forEach(({ x: cx, y: cy }) => {
                        capturedPositions.push({ x: cx, y: cy });
                    });
                }

                game.pushPosition(savedState);


            }
        }
    }

    // Add markers for all captured positions
    capturedPositions.forEach(({ x, y }) => {
        board.addObject({
            x: x,
            y: y,
            type: "MA", // X marker for atari
        });
    });

    updateAtariMarkersOpposite(game, board)
}

function updateAtariMarkersOpposite(game, board) {
    const position = game.getPosition();
    const size = position.size;
    const capturedPositions = []; // Array to store captured positions

    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            if (position.get(x, y) === 0) {
                // Save the current board state
                const savedState = game.getPosition().clone();
                if (!savedState.capCount) {
                    // Initialize capCount if not present
                    savedState.capCount = { black: 0, white: 0 };
                }

                // Simulate placing a black stone
                const captured = game.play(x, y, WGo.B);
                if (captured && captured.length > 0) {
                    // Store the captured positions
                    captured.forEach(({ x: cx, y: cy }) => {
                        capturedPositions.push({ x: cx, y: cy });
                    });
                }
                game.pushPosition(savedState);
            }
        }
    }

    // Add markers for all captured positions
    capturedPositions.forEach(({ x, y }) => {
        board.addObject({
            x: x,
            y: y,
            type: "MA", // X marker for atari
        });
    });

    board.redraw(); // Ensure the board updates
}

function restore_gamestate(game, move_history) {
    // Initialize a new WGo.Game instance
    game = new WGo.Game(game.size); // Replace 19 with your board size if different
    let err_flag = false

    // Iterate over the move history and play each move
    move_history.forEach(move => {
        const result = game.play(move.x, move.y, move.c);

        // Handle any errors during play
        if (result === 1) {
            console.error(`Invalid move: Coordinates (${move.x}, ${move.y}) are not on the board.`);
        } else if (result === 2) {
            console.error(`Invalid move: There is already a stone at (${move.x}, ${move.y}).`);
        } else if (result === 3) {
            console.error(`Invalid move: Move at (${move.x}, ${move.y}) would be suicide.`);
        } else if (result === 4) {
            console.error(`Invalid move: Move at (${move.x}, ${move.y}) repeats a previous position.`);
            err_flag = true
            return [game, err_flag];
        }
    });

    // Return the restored game instance
    return [game, err_flag];
}


function show_ai_hints(game, board, ai_hint) {
    if (!ai_hint) {
        return
    }
    updateAtariMarkers(game, board)
    ai_hint.forEach((ai_move) => {
        console.log(ai_move.move);
        ai_move = ai_move.move
        // Convert AI move to coordinates
        const ai_x = ai_move[0].charCodeAt(0) - "A".charCodeAt(0) - (ai_move[0] >= "J" ? 1 : 0);
        const ai_y = parseInt(ai_move.slice(1)) - 1;
        board.addObject({
            x: ai_x,
            y: ai_y,
            type: "CR", // Circle marker
            c: "rgba(0, 0, 0.1, 0.3)", // Optional: Customize the marker color (semi-transparent blue)
        });
    });
}

function handleCompanionToggle() {
    // Always update the toggle button UI first
    const isActive = companionToggleButton.classList.contains('bg-blue-500');
    companionToggleButton.classList.toggle('bg-blue-500', !isActive);
    companionToggleButton.classList.toggle('bg-gray-300', isActive);

    const toggleCircle = companionToggleButton.querySelector('div');
    toggleCircle.classList.toggle('translate-x-4', !isActive);

    // If there's no move yet, stop here to avoid errors
    if (move_count === 0) return;

    // Now restore the board state and show AI hints if toggled on
    clearBoardMarkers(board, game);
    restore_gamestate(game, move_history);

    // Only show hints if the toggle was just turned on
    if (!isActive) {
        show_ai_hints(game, board, ai_hint);
    }

    // Restore last move marker (so you don’t lose the marker after toggling)
    const lastMove = move_history[move_history.length - 1];
    addMarker(lastMove.x, lastMove.y, board, lastMove.c);
}