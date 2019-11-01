<template lang="pug">
  .team-player(:class="{ 'team-player--DST': player.position === 'DST' }")
    .team-player__photo
      img(:src="playerImageURL" alt="")
    .team-player__info
      .team-player__name {{player.displayname}}
        .team-player__team {{player.teamabbr}}
      .team-player__top-finishes
        strong {{player.times_best}}
        span Top {{ positionTopNum }} {{ player.position }} Weeks
</template>

<script>
export default {
  name: 'TeamPlayer',
  props: {
    player: Object,
    spacer: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    positionTopNum() {
      switch (this.player.position) {
        case 'QB':
          return 2
        case 'RB':
          return 4
        case 'WR':
          return 6
        case 'TE':
          return 2
        default:
          return 2
      }
    },
    playerImageURL() {
      if (this.player.position === 'DST') {
        return '/graphics/logos/' + this.player.teamabbr + '.svg'
      }
      return `/graphics/players/${this.player.esbid}.png`
    }
  }
}
</script>

<style lang="scss">
.team-player {
  border-top: 1px solid rgba(white, 0.1);
  display: grid;
  align-items: center;
  grid-template-columns: 6rem 1fr;
  padding: 1rem 0;
  grid-gap: 1rem;
}
.team-player__photo {
  background-color: darken($blue_dark, 5);
  border-radius: 100%;
  height: 6rem;
  overflow: hidden;
  position: relative;
  img {
    position: absolute;
    left: -0.5rem;
    top: 0.3rem;
    max-width: 7rem;
    .team-player--DST & {
      left: 0.5rem;
      top: 0.5rem;
      max-width: 5rem;
    }
  }
}
.team-player__name {
  display: flex;
  align-items: baseline;
  font-size: 1.4rem;
  @media (min-width: 48em) {
    font-size: 1.8rem;
  }
}
.team-player__team {
  font-size: 0.9rem;
  font-family: $font_ideal;
  opacity: 0.5;
  margin-left: 0.6rem;
  letter-spacing: 0.2rem;
  @media (min-width: 48em) {
    font-size: 1.1rem;
  }
}
.team-player__position {
  font-size: 1.2rem;
}
.team-player__top-finishes {
  position: relative;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  display: grid;
  grid-template-columns: 1.5rem auto 1fr;
  grid-gap: 0.4rem;
  align-items: center;
  strong {
    color: $blue;
    font-size: 1.6rem;
    letter-spacing: 0;
  }
  &::before {
    content: '';
    background: url(/graphics/icon_star.svg);
    background-size: contain;
    opacity: 0.5;
    height: 1.5rem;
    width: 1.5rem;
  }
}
</style>
