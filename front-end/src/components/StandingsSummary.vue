<template lang="pug">
  ol.standings-mini
    li.standings-mini__item(v-for="team in teams")
      router-link.standings-mini__link(:to="'/team/' + team.ownerid")
        .standings-mini__photo(:class="'owner-photo--' + team.ownerid")
        .standings-mini__name {{ team.displayname }}
        .standings-mini__record {{team.wins}}-{{team.losses}}
        .standings-mini__streak {{team.streak}}
</template>

<script>
export default {
  name: 'StandingsSummary',
  props: {
    teams: Array
  }
}
</script>

<style lang="scss">
.standings-mini {
  list-style: none;
  margin: 0;
  padding: 0;
}
.standings-mini__link {
  display: block;
  text-decoration: none;
  color: white;
  font-weight: normal;
  border: 1px solid rgba(white, 0.1);
  background-color: rgba(darken($blue_dark, 5), 0.65);
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  padding: 1.5rem 1.5rem 1.5rem 8.5rem;
  position: relative;
  padding-left: 8.5rem;
  transition: all 0.2s ease;
  @media (min-width: 25.875em) {
    display: grid;
    padding: 1rem;
    align-items: center;
    grid-column-gap: 2rem;
    grid-template-columns: 6rem 1fr auto 3.5rem;
  }
  &:hover {
    background-color: rgba($blue, 0.15);
    border-color: rgba($blue, 0.15);
    box-shadow: 0 8px 12px rgba(black, 0.8);
    transform: translateY(-0.4rem);
  }
}
.standings-mini__photo {
  width: 6rem;
  height: 6rem;
  border-radius: 100%;
  background-size: contain;
  position: absolute;
  left: 1rem;
  top: 1rem;
  @media (min-width: 25.875em) {
    position: static;
  }
}
.standings-mini__name {
  font-size: 1.8rem;
  line-height: 1.1;
  font-weight: bold;
}
.standings-mini__record {
  color: $blue;
  font-size: 2rem;
}
.standings-mini__streak {
  opacity: 0.7;
  font-size: 1.5rem;
  padding-right: 1rem;
  display: none;
  text-align: center;
  @media (min-width: 25.875em) {
    display: block;
  }
}
</style>
