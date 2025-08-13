import SwiftUI

struct SearchView: View {
    @ObservedObject var viewModel: SearchViewModel
    let items = Array(1...50)
    let itemWidth: CGFloat = 120
    
    var body: some View {
        HStack {
            VStack {
                Text("Paramètres")
                    .padding()
                    .font(.system(size: 30, weight: .bold))
                    .foregroundColor(Constants.white)
                ScrollView {
                    HStack {
                        Text("Genre")
                            .padding(.leading)
                            .font(.system(size: 23, weight: .bold))
                            .foregroundColor(Constants.white)
                        Spacer()
                    }
                    HStack {
                        Picker("", selection: $viewModel.selectedGenre) {
                            ForEach(Array(viewModel.genres.keys).sorted(), id: \.self) { genre in
                                if let unpackedGenre = viewModel.genres[genre] {
                                    Text(unpackedGenre)
                                }
                            }
                        }
                        .pickerStyle(.radioGroup)
                        .padding(.leading)
                        Spacer()
                    }
                    HStack {
                        Text("Ordre")
                            .padding(.leading)
                            .padding(.top, 25)
                            .font(.system(size: 23, weight: .bold))
                            .foregroundColor(Constants.white)
                        Spacer()
                    }
                    HStack {
                        Picker("", selection: $viewModel.selectedOrdering) {
                            ForEach(Array(viewModel.ordering.keys).sorted().reversed(), id: \.self) { order in
                                if let unpackedGenre = viewModel.ordering[order] {
                                    Text(unpackedGenre)
                                }
                            }
                        }
                        .pickerStyle(.radioGroup)
                        .padding(.leading)
                        Spacer()
                    }
                }
                Spacer()
            }
            .frame(maxWidth: 250)
            .background(Constants.darkGray)
            .font(.system(size: 20))
            .foregroundColor(.white)
            VStack {
                ZStack(alignment: .leading) {
                    TextField("", text: $viewModel.movieTitle)
                        .foregroundColor(.white)
                        .textFieldStyle(PlainTextFieldStyle())
                        .padding(10)
                        .background(Constants.darkGray)
                        .cornerRadius(5)
                        .font(.system(size: 20))
                        .padding(15)
                    if viewModel.movieTitle.isEmpty {
                        Text("Rechercher un film")
                            .foregroundColor(.gray)
                            .font(.system(size: 20))
                            .padding(.leading, 25)
                            .allowsHitTesting(false)
                    }
                }
                GeometryReader { geometry in
                    let columnsCount = max(Int(geometry.size.width / (itemWidth + 20)), 1)
                    let columns = Array(repeating: GridItem(.flexible()), count: columnsCount)
                    ScrollView {
                        LazyVGrid(columns: columns, spacing: 15) {
                            ForEach(items, id: \.self) { item in
                                RoundedRectangle(cornerRadius: 5)
                                    .fill(Constants.darkGray)
                                    .frame(width: itemWidth, height: 200)
                                    .overlay(Text("Film \(item)").foregroundColor(.white))
                            }
                        }
                        .padding()
                    }
                }
                Spacer()
            }
        }
    }
}

#Preview {
    WrapperView()
}
