<template lang="pug">
  div(@click="showStatlineModal")
    .matchup-player.matchup-player--spacer(v-if="spacer")
    .matchup-player(v-else :class="playerClasses")
      .matchup-player__img
        img(:src="playerImageURL" alt="")
      .matchup-player__details
        h4.matchup-player__name
          template(v-if="player.position !== 'DST'")
            span.matchup-player__first-letter {{ firstNameLetter }}&nbsp;
            span.matchup-player__first-name {{ player.firstName}}&nbsp;
            span.matchup-player__last-name {{ player.lastName}}
            .matchup-player__team {{player.teamAbbr}}
          template(v-else)
            span {{player.teamFullName}}
        template(v-if="player.game.isoTime")
          .matchup-player__game {{ gameDesc }}
        template(v-else)
          .matchup-player__game.matchup-player__game--bye BYE
        .matchup-player__stats(v-if="showStatline")
          .matchup-player__statline(v-if="player.statline")
            .matchup-player__statline-inner
              .matchup-player__statline-img
                img(:src="playerImageURL" alt="")
              template(v-if="player.position !== 'DST'")
                .matchup-player__statline-name {{ player.firstName}} {{ player.lastName}}
                  .matchup-player__statline-team {{player.teamAbbr}}
              template(v-else)
                .matchup-player__statline-name {{player.teamFullName}}
              .matchup-player__statline-game {{ gameDesc }}
              ul.matchup-player__stats.matchup-player__stats--dst(v-if="player.position === 'DST'")
                li.matchup-player__stat(v-if="player.statline.sacks")
                  | {{player.statline.sacks}} sacks
                li.matchup-player__stat(v-if="player.statline.fumbles")
                  | {{player.statline.fumbles}} fumble recoveries
                li.matchup-player__stat(v-if="player.statline.ints")
                  | {{player.statline.ints}} interceptions
                li.matchup-player__stat(v-if="player.statline.safeties")
                  | {{player.statline.safeties}} safeties
                li.matchup-player__stat(v-if="player.statline.TDs")
                  | {{player.statline.TDs}} TDs
                li.matchup-player__stat(v-if="player.statline.pointsAllowed")
                  | {{player.statline.pointsAllowed}} points allowed
              ul.matchup-player__stats(v-else)
                li.matchup-player__stat(v-if="player.statline.passingAttempts")
                  | {{player.statline.passingCompletions}}/{{player.statline.passingAttempts}} for {{player.statline.passingYards}} yards, {{player.statline.passingTDs}} TDs, {{player.statline.passingInts}} Ints
                  template(v-if="player.statline.passingTwoPts") {{player.statline.passingTwoPts}} Two Point Conversions
                li.matchup-player__stat(v-if="player.statline.rushingAttempts")
                  | {{player.statline.rushingAttempts}} rushes for {{player.statline.rushingYards}} yards, {{player.statline.rushingTDs}} TDs
                  template(v-if="player.statline.rushingTwoPts") {{player.statline.rushingTwoPts}} Two Point Conversions
                li.matchup-player__stat(v-if="player.statline.receivingReceptions")
                  | {{player.statline.receivingReceptions}} receptions for {{player.statline.receivingYards}} yards, {{player.statline.receivingTDs}} TDs
                  template(v-if="player.statline.receivingTwoPts") {{player.statline.receivingTwoPts}} Two Point Conversions
                li.matchup-player__stat(v-if="player.statline.fumbles")
                  | {{player.statline.fumbles}} fumbles
      .matchup-player__points(v-html="playerFantasyPoints")
</template>

<script>
import moment from 'moment'
import scoreFormatter from '@/utility/scoreFormatter'
export default {
  name: 'MatchupPlayer',
  props: {
    player: Object,
    spacer: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      showStatline: false
    }
  },
  watch: {
    player(a, b) {
      if (a.fantasyPoints != b.fantasyPoints) {
        const changeMessage = `${
          this.player.displayName
        } points changed ${a.fantasyPoints - b.fantasyPoints}`
        this.$emit('player-change', changeMessage)
      }
    }
  },
  computed: {
    firstNameLetter() {
      return `${this.player.firstName.charAt(0)}.`
    },
    playerClasses() {
      let isPlaying = false
      if (this.player.game) {
        if (this.player.game.quarter) {
          if (
            this.player.game.quarter !== 'Final' &&
            this.player.game.quarter !== 'final overtime'
          ) {
            isPlaying = true
          }
        }
      }
      return {
        'matchup-player--DST': this.player.position === 'DST',
        'matchup-player--best': this.player.best && this.player.fantasyPoints,
        'matchup-player--playing': isPlaying
      }
    },
    playerImageURL() {
      if (this.player.position === 'DST') {
        return '/graphics/logos/' + this.player.teamAbbr + '.svg'
      }
      return `/graphics/players/${this.player.esbId}.png`
    },
    opponentAbbr() {
      if (this.player.teamAbbr === this.player.game.awayTeam.teamAbbr) {
        return this.player.game.homeTeam.teamAbbr
      }
      return this.player.game.awayTeam.teamAbbr
    },
    playerFantasyPoints() {
      if (this.player.fantasyPoints) {
        return scoreFormatter(this.player.fantasyPoints)
      }
      if (this.player.game) {
        if (this.player.game.quarter) {
          return scoreFormatter(0.0)
        }
      }
      return '--'
    },
    gameDesc() {
      const game = this.player.game
      const gameTime = moment(this.player.game.isoTime).format('ddd h:mm A')
      if (!game.quarter) {
        if (this.player.teamAbbr === game.awayTeam.teamAbbr) {
          return `at ${this.opponentAbbr}, ${gameTime}`
        }
        return `vs ${this.opponentAbbr}, ${gameTime}`
      } else if (
        game.quarter === 'Final' ||
        game.quarter === 'final overtime'
      ) {
        if (this.player.teamAbbr === game.awayTeam.teamAbbr) {
          const gameResult = this.gameResult(
            game.awayTeam.score.current,
            game.homeTeam.score.current
          )
          return `${gameResult} ${game.awayTeam.score.current}-${game.homeTeam.score.current} at ${this.opponentAbbr}`
        }
        const gameResult = this.gameResult(
          game.homeTeam.score.current,
          game.awayTeam.score.current
        )
        return `${gameResult} ${game.homeTeam.score.current}-${game.awayTeam.score.current} vs ${this.opponentAbbr}`
      }
      const score = `${game.homeTeam.teamAbbr} ${game.homeTeam.score.current} @ ${game.awayTeam.teamAbbr} ${game.awayTeam.score.current}`
      if (game.quarter === 'Halftime') {
        return `${score} • Half`
      }
      return `${score} • ${this.formatQuarter(game.quarter)} ${game.clock}`
    }
  },
  methods: {
    showStatlineModal() {
      if (this.player.statline && !this.showStatline) {
        this.showStatline = true
      } else {
        this.showStatline = false
      }
    },
    formatQuarter(quarter) {
      switch (quarter) {
        case '1':
          return '1st'
        case '2':
          return '2nd'
        case '3':
          return '3rd'
        case '4':
          return '4th'
      }
      return quarter
    },
    gameResult(playerScore, opposingScore) {
      if (playerScore > opposingScore) {
        return 'Won'
      }
      if (playerScore == opposingScore) {
        return 'Tied'
      }
      return 'Lost'
    }
  }
}
</script>

<style lang="scss">
.matchup-player {
  padding: 1rem 1rem 1rem 1.5rem;
  border-radius: 0.5rem;
  border: 1px solid transparent;
  min-height: 10.6rem;
  display: grid;
  grid-template-columns: 4rem 1fr;
  background-color: darken($blue_dark, 7);
  align-items: center;
  position: relative;
  @media (min-width: 48em) {
    min-height: 5rem;
    padding: 0.5rem 1.5rem 0.5rem 1rem;
    grid-template-columns: 4rem 1fr auto;
  }
}
.matchup-player--best {
  background-color: lighten($blue_dark, 3);
  &::before {
    content: '';
    width: 0;
    height: 0;
    position: absolute;
    top: calc(50% - 0.75rem);
    left: -0.75rem;
    background: url(/graphics/icon_star.svg);
    background-size: contain;
    height: 1.5rem;
    width: 1.5rem;
  }
}
.matchup-player--playing {
  border-color: rgba($blue, 0.5);
  &::after {
    background-color: $blue;
    content: '';
    position: absolute;
    opacity: 1;
    right: 0;
    top: 1rem;
    height: 4rem;
    width: 6rem;
    @media (min-width: 48em) {
      opacity: 1;
      right: 0;
      top: 0;
      height: auto;
      bottom: 0;
      width: 7.2rem;
      border-radius: 0 0.5rem 0.5rem 0;
    }
  }
  .matchup-player__points {
    color: $blue_dark;
    position: relative;
    z-index: 1;
  }
}
.matchup-player--spacer {
  background-color: transparent;
}
.matchup-player__img {
  background-color: darken($blue_dark, 5);
  border-radius: 100%;
  height: 4rem;
  overflow: hidden;
  position: relative;
  img {
    position: absolute;
    left: -0.5rem;
    top: 0.3rem;
    max-width: 5rem;
    .matchup-player--DST & {
      left: 0.5rem;
      top: 0.5rem;
      max-width: 3rem;
    }
  }
}
.matchup-player__details {
  grid-column: 1 / 3;
  padding-top: 1rem;
  @media (min-width: 48em) {
    grid-area: auto;
    padding-top: 0;
    padding-left: 1rem;
  }
}
.matchup-player__name {
  display: flex;
  align-items: baseline;
  font-size: 1.3rem;
  font-weight: 300;
  @media (min-width: 60em) {
    font-size: 1.5rem;
  }
}
.matchup-player__first-letter {
  @media (min-width: 60em) {
    display: none;
  }
  .matchup-player--DST & {
    display: none;
  }
}
.matchup-player__first-name {
  display: none;
  @media (min-width: 60em) {
    display: inline;
  }
  .matchup-player--DST & {
    display: inline;
  }
}
.matchup-player__team {
  font-size: 0.9rem;
  font-family: $font_ideal;
  opacity: 0.5;
  margin-left: 0.6rem;
  letter-spacing: 0.2rem;
  @media (min-width: 48em) {
    font-size: 1.1rem;
  }
}
.matchup-player__game {
  font-size: 1rem;
  opacity: 0.7;
  font-family: $font_ideal;
}
.matchup-player__game--bye {
}
.matchup-player__statline {
  position: fixed;
  background-color: rgba(black, 0.5);
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}
.matchup-player__statline-inner {
  background-color: $green;
  border-radius: 4px;
  padding: 2rem 2rem 1rem;
  color: $blue_dark;
  width: 30rem;
}
.matchup-player__statline-img {
  background-color: white;
  border-radius: 100%;
  height: 12rem;
  width: 12rem;
  border: 0.5rem solid white;
  box-shadow: 0 2px 2px rgba(black, 0.05), 0 4px 4px rgba(black, 0.08),
    0 12px 12px rgba(black, 0.11);
  margin: -4rem auto 1rem;
  overflow: hidden;
  position: relative;
  img {
    position: absolute;
    left: -1.5rem;
    top: 0.3rem;
    max-width: 14rem;
    .matchup-player--DST & {
      left: 0.5rem;
      top: 0.5rem;
      max-width: 10rem;
    }
  }
}
.matchup-player__statline-name {
  font-size: 2.4rem;
  text-align: center;
}
.matchup-player__statline-team {
  display: inline-block;
  font-size: 1.2rem;
  margin-left: 0.4rem;
  font-weight: bold;
  font-family: $font_ideal;
  letter-spacing: 0.1em;
  opacity: 0.5;
}
.matchup-player__statline-game {
  text-align: center;
  font-size: 1.1rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 1rem;
}
.matchup-player__best {
}
.matchup-player__stats {
}
.matchup-player__stats--dst {
}
.matchup-player__stats {
}
.matchup-player__stat {
  border-top: 1px solid rgba(black, 0.15);
  padding: 0.8rem 0;
}
.matchup-player__points {
  grid-column: 2;
  grid-row: 1;
  font-size: 2.4rem;
  color: $blue;
  margin-left: auto;
  @media (min-width: 48em) {
    grid-area: auto;
  }
}
.matchup-player__points--to-play {
}
</style>
